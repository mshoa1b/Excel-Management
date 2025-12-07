const express = require('express');
const router = express.Router();
const pool = require('../lib/db');
const { createOrder, createLabel } = require('../lib/shipstation');
const authenticateToken = require('../middleware/auth');
const { open } = require('../lib/secretbox');
const fetch = require('node-fetch');

// Helper to fetch Back Market order details
async function fetchBackMarketOrder(businessId, orderNumber) {
  try {
    const c = await pool.query(
      `SELECT api_key_enc, api_secret_enc FROM backmarket_credentials WHERE business_id = $1`,
      [businessId]
    );
    if (c.rowCount === 0) return null;

    const stored_credentials = open(c.rows[0].api_key_enc);
    let api_key, api_secret;

    if (stored_credentials) {
      let credentials_to_parse = stored_credentials;
      try {
        if (/^[A-Za-z0-9+/=]+$/.test(stored_credentials)) {
          const decoded = Buffer.from(stored_credentials, 'base64').toString('utf8');
          if (decoded.includes(':')) credentials_to_parse = decoded;
        }
      } catch (e) {}

      if (credentials_to_parse.includes(':')) {
        const parts = credentials_to_parse.split(':');
        api_key = parts[0];
        api_secret = parts[1];
      } else {
        api_key = credentials_to_parse;
        api_secret = c.rows[0].api_secret_enc ? open(c.rows[0].api_secret_enc) : null;
      }
    }

    const payload = api_secret ? `${api_key}:${api_secret}` : `${api_key}:`;
    const authHeader = `Basic ${Buffer.from(payload).toString('base64')}`;

    const response = await fetch(`https://www.backmarket.fr/ws/orders/${orderNumber}`, {
      headers: { Authorization: authHeader, "Content-Type": "application/json" }
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching BM order:', error);
    return null;
  }
}

// POST /api/shipstation/create-label
router.post('/create-label', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { sheetId, overrides } = req.body;

    if (!sheetId) throw new Error('Sheet ID is required');

    // 1. Fetch Sheet
    const sheetResult = await client.query('SELECT * FROM sheets WHERE id = $1', [sheetId]);
    if (sheetResult.rowCount === 0) throw new Error('Sheet not found');
    const sheet = sheetResult.rows[0];

    // 2. Fetch Business (Ship From)
    const businessResult = await client.query('SELECT * FROM businesses WHERE id = $1', [sheet.business_id]);
    if (businessResult.rowCount === 0) throw new Error('Business not found');
    const business = businessResult.rows[0];

    // 3. Fetch Back Market Data (if needed/available)
    let bmOrder = null;
    if (sheet.platform === 'Back Market' && /^\d{8}$/.test(sheet.order_no)) {
      bmOrder = await fetchBackMarketOrder(sheet.business_id, sheet.order_no);
    }

    // 4. Prepare Data
    // Ship From
    const shipFrom = {
      name: overrides?.shipFrom?.name || business.name,
      street1: overrides?.shipFrom?.street1 || business.street1 || '',
      city: overrides?.shipFrom?.city || business.city || '',
      state: overrides?.shipFrom?.state || business.state || '',
      postalCode: overrides?.shipFrom?.postalCode || business.postal_code || '',
      country: overrides?.shipFrom?.country || business.country || 'GB'
    };

    // Ship To (Priority: Overrides > BM > Sheet)
    const shipTo = {
      name: overrides?.name || bmOrder?.shipping_address?.first_name + ' ' + bmOrder?.shipping_address?.last_name || sheet.customer_name,
      street1: overrides?.street1 || bmOrder?.shipping_address?.street || '',
      city: overrides?.city || bmOrder?.shipping_address?.city || '',
      state: overrides?.state || bmOrder?.shipping_address?.state || '',
      postalCode: overrides?.postalCode || bmOrder?.shipping_address?.postal_code || '',
      country: overrides?.country || bmOrder?.shipping_address?.country || 'GB',
      phone: overrides?.phone || bmOrder?.shipping_address?.phone || '',
      email: overrides?.email || bmOrder?.customer?.email || ''
    };

    // Validate Required Fields
    const requiredFields = ['name', 'street1', 'city', 'postalCode', 'country'];
    const missing = requiredFields.filter(f => !shipTo[f]);
    if (missing.length > 0) {
      throw new Error(`Missing required shipping fields: ${missing.join(', ')}`);
    }
    if (!shipFrom.street1 || !shipFrom.postalCode) {
        throw new Error(`Business address (Ship From) is incomplete. Please update business settings or provide overrides.`);
    }

    // 5. Create Order in ShipStation
    const orderPayload = {
      orderNumber: overrides?.orderNumber || sheet.order_no || `SHEET-${sheet.id}`,
      orderDate: sheet.order_date || new Date().toISOString(),
      orderStatus: 'awaiting_shipment',
      customerEmail: shipTo.email,
      customerUsername: shipTo.name,
      billTo: { name: shipTo.name },
      shipTo: shipTo,
      items: [
        {
          sku: overrides?.sku || sheet.sku || 'GENERIC',
          name: overrides?.itemName || sheet.issue || 'Repair/Replacement',
          quantity: 1
        }
      ]
    };

    console.log('Creating ShipStation Order:', JSON.stringify(orderPayload, null, 2));
    const orderResponse = await createOrder(orderPayload);
    const orderId = orderResponse.orderId;

    // 6. Create Label in ShipStation
    const labelPayload = {
      carrierCode: "royalmail",
      serviceCode: "royal_mail_tracked_24",
      packageCode: "package",
      confirmation: "none",
      shipDate: overrides?.shipDate || new Date().toISOString().split('T')[0],
      weight: {
        value: overrides?.weight || 250,
        units: "grams"
      },
      shipTo: shipTo,
      shipFrom: shipFrom,
      orderId: orderId // Link to the order we just created
    };

    console.log('Creating ShipStation Label:', JSON.stringify(labelPayload, null, 2));
    const labelResponse = await createLabel(labelPayload);

    // 7. Save to Database
    const insertQuery = `
      INSERT INTO shipStationLabels 
      (sheet_id, shipstation_order_id, shipstation_shipment_id, shipstation_label_url, shipstation_label_pdf_base64, shipstation_tracking_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const savedLabel = await client.query(insertQuery, [
      sheetId,
      orderId,
      labelResponse.shipmentId,
      labelResponse.labelData, // This might be URL or Base64 depending on API, docs say "labelData" is base64 usually? 
      // Wait, the prompt says: "labelData": "<base64-PDF>" in response.
      // And "labelDownload": "<URL>".
      // So labelResponse.labelData is base64.
      // labelResponse.labelDownload is URL.
      labelResponse.labelDownload?.href || labelResponse.labelDownload, // API might return object or string
      labelResponse.labelData,
      labelResponse.trackingNumber
    ]);

    await client.query('COMMIT');

    res.json({
      success: true,
      labelUrl: labelResponse.labelDownload?.href || labelResponse.labelDownload,
      labelPdf: labelResponse.labelData,
      trackingNumber: labelResponse.trackingNumber,
      shipmentId: labelResponse.shipmentId,
      orderId: orderId,
      dbRecord: savedLabel.rows[0]
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Create Label Error:', error);
    res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
});

// GET /api/shipstation/labels/:sheetId
router.get('/labels/:sheetId', authenticateToken, async (req, res) => {
  try {
    const { sheetId } = req.params;
    const result = await pool.query(
      'SELECT * FROM shipStationLabels WHERE sheet_id = $1 ORDER BY created_at DESC',
      [sheetId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
