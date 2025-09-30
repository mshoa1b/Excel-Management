const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const { getSheets, createSheet, updateSheet, deleteSheet } = require("../models/Sheet");
const pool = require("../lib/db");

// GET /api/sheets/:businessId
router.get("/:businessId", authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { rows } = await pool.query(
      `
      SELECT
        id,
        business_id,
        date_received,
        order_date,
        order_no,
        customer_name,
        imei,
        sku,
        customer_comment,
        multiple_return,
        apple_google_id,
        return_type,
        replacement_available,
        done_by,
        blocked_by,
        cs_comment,
        resolution,
        COALESCE(refund_amount,0)::float AS refund_amount,
        return_tracking_no,
        platform,
        return_within_30_days,
        issue,
        out_of_warranty,
        additional_notes,
        status,
        manager_notes
      FROM sheets
      WHERE business_id = $1
      ORDER BY date_received DESC, id DESC
      `,
      [businessId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/sheets/:businessId error:", err);
    res.status(500).json({ message: "Failed to fetch sheets" });
  }
});

// POST /api/sheets/:businessId
router.post("/:businessId", authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const sheet = { ...req.body, business_id: businessId };
    const created = await createSheet(sheet);
    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/sheets/:businessId error:", err);
    res.status(500).json({ message: "Failed to create sheet" });
  }
});

// PUT /api/sheets/:businessId
router.put("/:businessId", authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const sheet = { ...req.body, business_id: businessId };
    if (!sheet.id) return res.status(400).json({ message: "id is required" });
    const updated = await updateSheet(sheet);
    res.json(updated);
  } catch (err) {
    console.error("PUT /api/sheets/:businessId error:", err);
    res.status(500).json({ message: "Failed to update sheet" });
  }
});

// DELETE /api/sheets/:businessId
router.delete("/:businessId", authenticateToken, async (req, res) => {
  try {
    const { businessId } = req.params;
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ message: "id is required" });
    await deleteSheet(id, businessId);
    res.json({ message: "Sheet deleted" });
  } catch (err) {
    console.error("DELETE /api/sheets/:businessId error:", err);
    res.status(500).json({ message: "Failed to delete sheet" });
  }
});

module.exports = router;
