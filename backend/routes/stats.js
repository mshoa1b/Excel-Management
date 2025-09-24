const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");

const getDateRange = (range) => {
  const today = new Date();
  const d = new Date(today);
  switch (range) {
    case "1d": d.setDate(today.getDate() - 1); break;
    case "1w": d.setDate(today.getDate() - 7); break;
    case "1m": d.setMonth(today.getMonth() - 1); break;
    case "3m": d.setMonth(today.getMonth() - 3); break;
    case "1y": d.setFullYear(today.getFullYear() - 1); break;
    default: return today.toISOString().split("T")[0];
  }
  return d.toISOString().split("T")[0];
};

// POST /api/stats/:businessId
router.post("/:businessId", authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { range } = req.body || {};
    const startDate = getDateRange(range);

    const { rows } = await pool.query(
      `SELECT
         COUNT(*)::int                          AS total_orders,
         COALESCE(SUM(refund_amount), 0)::float AS total_refund,
         COALESCE(AVG(refund_amount), 0)::float AS avg_refund,
         COUNT(DISTINCT order_no)::int          AS unique_orders
       FROM sheets
       WHERE business_id = $1 AND date >= $2`,
      [businessId, startDate]
    );

    const r = rows[0];
    res.json({
      totalOrders: r.total_orders,
      totalRefundAmount: r.total_refund,
      averageRefundAmount: r.avg_refund,
      uniqueOrders: r.unique_orders,
      range
    });
  } catch (err) {
    console.error("POST /api/stats/:businessId error:", err);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

module.exports = router;
