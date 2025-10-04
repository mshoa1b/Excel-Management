const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const BM_API_KEY = process.env.BM_API_KEY;
const BM_API_URL = 'https://www.backmarket.fr/ws/orders/';

// GET /api/bmOrders/:orderNumber
router.get('/:orderNumber', authenticateToken, async (req, res) => {
  const { orderNumber } = req.params;

  // Validate Back Market order number
  if (!/^\d{8}$/.test(orderNumber)) {
    return res.status(400).json({ message: 'Invalid Back Market order number' });
  }

  try {
    // Fetch order data from BM API using built-in fetch
    const response = await fetch(`${BM_API_URL}${orderNumber}`, {
      headers: {
        'Authorization': `Basic ${BM_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ message: text });
    }

    const orderData = await response.json();

    // Map only the fields present in your sheet
    const sheetData = {
      customer_name: `${orderData.shipping_address.first_name} ${orderData.shipping_address.last_name}`,
      imei: orderData.orderlines[0]?.imei || '',
      sku: orderData.orderlines[0]?.product || orderData.orderlines[0]?.listing || '',
      order_date: orderData.date_creation.slice(0, 10),
      date_received: orderData.date_shipping
        ? orderData.date_shipping.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      return_tracking_no: orderData.tracking_number || '',
      refund_amount: Number(orderData.price ?? 0),
      platform: 'Back Market',
      return_within_30_days: orderData.date_shipping
        ? Math.floor(
            (new Date(orderData.date_shipping) - new Date(orderData.date_creation)) /
              (1000 * 60 * 60 * 24)
          ) <= 30
        : true,
      // Defaults for other sheet columns
      multiple_return: 'Choose',
      apple_google_id: 'Choose',
      return_type: 'Refund',
      replacement_available: 'Yes',
      done_by: '',
      blocked_by: 'PIN required',
      cs_comment: '',
      resolution: 'Back in stock',
      issue: 'Choose',
      out_of_warranty: false,
      additional_notes: '',
      status: 'Pending',
      manager_notes: '',
    };

    res.json(sheetData);
  } catch (err) {
    console.error('BM API fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch Back Market order' });
  }
});

module.exports = router;
