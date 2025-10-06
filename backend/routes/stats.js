// routes/stats.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { ROLE } = require("../lib/roles");

// If range is omitted or invalid, default to last 1 month
const getDateRange = (range) => {
  const today = new Date(); // local time ok since we only need YYYY-MM-DD
  const d = new Date(today);
  switch ((range || "").toLowerCase()) {
    case "1d":
      d.setDate(today.getDate() - 1);
      break;
    case "1w":
      d.setDate(today.getDate() - 7);
      break;
    case "1m":
      d.setMonth(today.getMonth() - 1);
      break;
    case "3m":
      d.setMonth(today.getMonth() - 3);
      break;
    case "1y":
      d.setFullYear(today.getFullYear() - 1);
      break;
    default:
      d.setMonth(today.getMonth() - 1);
      break;
  }
  return d.toISOString().split("T")[0];
};

function assertBusinessScope(req, res, next) {
  const paramBiz = Number(req.params.businessId);
  if (!paramBiz || Number.isNaN(paramBiz)) {
    return res.status(400).json({ message: "Invalid businessId" });
  }
  const myRole = req.user?.role_id;
  const myBiz = req.user?.business_id;

  if (myRole === ROLE.SUPER_ADMIN) return next();
  if (myBiz !== paramBiz) return res.status(403).json({ message: "Forbidden" });
  return next();
}

// POST /api/stats/:businessId
router.post("/:businessId", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    const { rows } = await pool.query(
      `
      SELECT
        COUNT(*)::int                          AS total_orders,
        COALESCE(SUM(refund_amount), 0)::float AS total_refund,
        COALESCE(AVG(refund_amount), 0)::float AS avg_refund,
        COUNT(DISTINCT order_no)::int          AS unique_orders
      FROM sheets
      WHERE business_id = $1 AND date_received >= $2
      `,
      [businessId, startDate]
    );

    const r = rows[0] || {
      total_orders: 0,
      total_refund: 0,
      avg_refund: 0,
      unique_orders: 0
    };

    res.json({
      totalOrders: r.total_orders,
      totalRefundAmount: r.total_refund,
      averageRefundAmount: r.avg_refund,
      uniqueOrders: r.unique_orders,
      range: range || "1m",
      startDate
    });
  } catch (err) {
    console.error("POST /api/stats/:businessId error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

module.exports = router;
