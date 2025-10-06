// routes/bmOrders.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { open } = require("../lib/secretbox");
const { ROLE } = require("../lib/roles");

// Prefer env override if needed (rare); default to FR endpoint
const BM_API_URL = process.env.BM_API_URL || "https://www.backmarket.fr/ws/orders/";

// Build Authorization header from stored key/secret
const buildAuthHeader = (api_key, api_secret) => {
  if (!api_key) return null;
  const payload = api_secret ? `${api_key}:${api_secret}` : `${api_key}:`;
  const b64 = Buffer.from(payload).toString("base64");
  return `Basic ${b64}`;
};

// Resolve the business to use based on role and optional query param
function resolveBusinessId(req) {
  const q = Number(req.query.businessId);
  if (req.user?.role_id === ROLE.SUPER_ADMIN && q) return q;
  return req.user?.business_id || null;
}

// GET /api/bmOrders/:orderNumber[?businessId=ID]
router.get("/:orderNumber", authenticateToken, async (req, res) => {
  const { orderNumber } = req.params;

  if (!/^\d{8}$/.test(orderNumber)) {
    return res.status(400).json({ message: "Invalid Back Market order number" });
  }

  const businessId = resolveBusinessId(req);
  if (!businessId) return res.status(400).json({ message: "No business scope" });

  try {
    // Load per-business encrypted credentials
    const c = await pool.query(
      `SELECT api_key_enc, api_secret_enc FROM backmarket_credentials WHERE business_id = $1`,
      [businessId]
    );
    if (c.rowCount === 0) {
      return res.status(404).json({ message: "No Back Market credentials configured for this business" });
    }

    const api_key = open(c.rows[0].api_key_enc);
    const api_secret = open(c.rows[0].api_secret_enc);
    const authHeader = buildAuthHeader(api_key, api_secret);
    if (!authHeader) {
      return res.status(500).json({ message: "Back Market credentials invalid" });
    }

    const response = await fetch(`${BM_API_URL}${orderNumber}`, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ message: text || "BM API error" });
    }

    const orderData = await response.json();

    const firstLine = Array.isArray(orderData.orderlines) ? orderData.orderlines[0] : undefined;
    const created = orderData?.date_creation ? new Date(orderData.date_creation) : null;
    const shipped = orderData?.date_shipping ? new Date(orderData.date_shipping) : null;
    const within30 =
      created && shipped
        ? Math.floor((shipped - created) / (1000 * 60 * 60 * 24)) <= 30
        : true;

    const sheetData = {
      customer_name: `${orderData?.shipping_address?.first_name || ""} ${orderData?.shipping_address?.last_name || ""}`.trim(),
      imei: firstLine?.imei || "",
      sku: firstLine?.product || firstLine?.listing || "",
      order_date: created ? created.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      date_received: shipped ? shipped.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      return_tracking_no: orderData?.tracking_number || "",
      refund_amount: Number(orderData?.price ?? 0),
      platform: "Back Market",
      return_within_30_days: within30 ? "Yes" : "No",

      multiple_return: "Choose",
      apple_google_id: "Choose",
      return_type: "Refund",
      replacement_available: "Yes",
      done_by: "",
      blocked_by: "PIN Required",
      cs_comment: "",
      resolution: "Back in stock",
      issue: "Choose",
      out_of_warranty: "No",
      additional_notes: "",
      status: "Pending",
      manager_notes: ""
    };

    res.json(sheetData);
  } catch (err) {
    console.error("BM API fetch error:", err);
    res.status(500).json({ message: "Failed to fetch Back Market order" });
  }
});

module.exports = router;
