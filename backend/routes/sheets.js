// routes/sheets.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { getSheets, createSheet, updateSheet, deleteSheet } = require("../models/Sheet");
const { ROLE } = require("../lib/roles");

// Guard: only SuperAdmin can access any business; others must match their business_id
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

// GET /api/sheets/:businessId
router.get("/:businessId", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);

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
        locked,
        oow_case,
        replacement_available,
        done_by,
        blocked_by,
        cs_comment,
        resolution,
        COALESCE(refund_amount,0)::float AS refund_amount,
        refund_date,
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
router.post("/:businessId", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const sheet = { ...req.body, business_id: businessId };

    // Hard normalize a couple of values that often come wrong from clients
    if (typeof sheet.return_within_30_days === "boolean") {
      sheet.return_within_30_days = sheet.return_within_30_days ? "Yes" : "No";
    }
    if (sheet.out_of_warranty === true) sheet.out_of_warranty = "Yes";
    if (sheet.out_of_warranty === false) sheet.out_of_warranty = "No";

    // Align enum spelling for blocked_by if client sent "PIN required"
    if (sheet.blocked_by && /^pin required$/i.test(sheet.blocked_by)) {
      sheet.blocked_by = "PIN Required";
    }

    const created = await createSheet(sheet);
    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/sheets/:businessId error:", err);
    res.status(500).json({ message: "Failed to create sheet" });
  }
});

// PUT /api/sheets/:businessId
router.put("/:businessId", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const sheet = { ...req.body, business_id: businessId };
    if (!sheet.id) return res.status(400).json({ message: "id is required" });

    if (typeof sheet.return_within_30_days === "boolean") {
      sheet.return_within_30_days = sheet.return_within_30_days ? "Yes" : "No";
    }
    if (sheet.out_of_warranty === true) sheet.out_of_warranty = "Yes";
    if (sheet.out_of_warranty === false) sheet.out_of_warranty = "No";
    if (sheet.blocked_by && /^pin required$/i.test(sheet.blocked_by)) {
      sheet.blocked_by = "PIN Required";
    }

    const updated = await updateSheet(sheet);
    res.json(updated);
  } catch (err) {
    console.error("PUT /api/sheets/:businessId error:", err);
    res.status(500).json({ message: "Failed to update sheet" });
  }
});

// DELETE /api/sheets/:businessId
router.delete("/:businessId", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
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
