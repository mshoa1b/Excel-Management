// routes/sheets.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { getSheets, createSheet, updateSheet, deleteSheet, getSheetHistory } = require("../models/Sheet");
const { notifyUsers } = require("./notifications");
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

// GET /api/sheets/:businessId - Default filtered load
router.get("/:businessId", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    
    // Get today's date
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const { rows } = await pool.query(
      `
      SELECT
        id, business_id, date_received, order_date, order_no, customer_name, imei, sku,
        customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
        replacement_available, done_by, blocked_by, cs_comment, resolution,
        COALESCE(refund_amount,0)::float AS refund_amount, refund_date, return_tracking_no,
        platform, return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes, updated_at
      FROM sheets
      WHERE business_id = $1
        AND (
          status != 'Resolved'
          OR (status = 'Resolved' AND DATE(updated_at) = $2)
        )
      ORDER BY 
        CASE WHEN blocked_by IS NOT NULL AND blocked_by != '' THEN 0 ELSE 1 END,
        CASE WHEN status != 'Resolved' THEN 0 ELSE 1 END,
        CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END,
        date_received DESC,
        id DESC
      `,
      [businessId, todayStr]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/sheets/:businessId error:", err);
    res.status(500).json({ message: "Failed to fetch sheets" });
  }
});

// GET /api/sheets/:businessId/search?q=searchTerm - Search in all records
router.get("/:businessId/search", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const searchTerm = req.query.q?.toString().trim();
    
    if (!searchTerm) {
      return res.json([]);
    }

    const { rows } = await pool.query(
      `
      SELECT
        id, business_id, date_received, order_date, order_no, customer_name, imei, sku,
        customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
        replacement_available, done_by, blocked_by, cs_comment, resolution,
        COALESCE(refund_amount,0)::float AS refund_amount, refund_date, return_tracking_no,
        platform, return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes, updated_at
      FROM sheets
      WHERE business_id = $1
        AND (
          LOWER(order_no) LIKE LOWER($2)
          OR LOWER(customer_name) LIKE LOWER($2)
        )
      ORDER BY 
        CASE WHEN blocked_by IS NOT NULL AND blocked_by != '' THEN 0 ELSE 1 END,
        CASE WHEN status != 'Resolved' THEN 0 ELSE 1 END,
        CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END,
        date_received DESC,
        id DESC
      `,
      [businessId, `%${searchTerm}%`]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/sheets/:businessId/search error:", err);
    res.status(500).json({ message: "Failed to search sheets" });
  }
});

// GET /api/sheets/:businessId/daterange?from=date&to=date - Filter by date range
router.get("/:businessId/daterange", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const dateFrom = req.query.from?.toString();
    const dateTo = req.query.to?.toString();
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "Both from and to dates are required" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        id, business_id, date_received, order_date, order_no, customer_name, imei, sku,
        customer_comment, multiple_return, apple_google_id, return_type, locked, oow_case,
        replacement_available, done_by, blocked_by, cs_comment, resolution,
        COALESCE(refund_amount,0)::float AS refund_amount, refund_date, return_tracking_no,
        platform, return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes, updated_at
      FROM sheets
      WHERE business_id = $1
        AND date_received >= $2
        AND date_received <= $3
      ORDER BY 
        CASE WHEN blocked_by IS NOT NULL AND blocked_by != '' THEN 0 ELSE 1 END,
        CASE WHEN status != 'Resolved' THEN 0 ELSE 1 END,
        CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END,
        date_received DESC,
        id DESC
      `,
      [businessId, dateFrom, dateTo]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/sheets/:businessId/daterange error:", err);
    res.status(500).json({ message: "Failed to fetch sheets by date range" });
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

    const created = await createSheet(sheet, req.user?.id);
    res.status(201).json(created);
  } catch (err) {
    console.error("POST /api/sheets/:businessId error:", err);
    // Return more detailed error information for debugging
    res.status(500).json({ 
      message: "Failed to create sheet",
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
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

    const updated = await updateSheet(sheet, req.user?.id);

    // Notify if status became 'Resolved' or blocked_by became non-empty
    // We need to compare with old state? ideally yes, but `updated` might just be the new state.
    // For simplicity, if the NEW state is resolved/blocked, and assuming user clicked it, we notify.
    // To be precise we'd need old state, but let's notify on "Action taken".

    // Check if Resolved
    if (updated.status === 'Resolved' && sheet.status === 'Resolved') { 
       // Note: sheet.status comes from request body, so it was intended.
       await notifyUsers(
         businessId, 
         req.user.username, 
         'success', 
         `Sheet Resolved: ${updated.order_no}`, 
         `Sheet marked as Resolved by ${req.user.username}`,
         `/sheets` // Or link to specific row if supported
       );
    }

    // Check if Blocked (and not empty)
    if (updated.blocked_by && updated.blocked_by.trim() !== '' && updated.blocked_by !== 'Choose') {
       // Avoid notifying if it was ALREADY blocked same way? 
       // Ideally yes, but lacking old state here cleanly without extra query. 
       // We can assume frontend calls update when changing it.
       await notifyUsers(
         businessId, 
         req.user.username, 
         'warning', 
         `Sheet Blocked: ${updated.order_no}`, 
         `Sheet blocked by ${req.user.username}: ${updated.blocked_by}`,
         `/sheets`
       );
    }

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

// GET /api/sheets/:businessId/refunds-report - Get filtered refunds data for PDF report
router.get("/:businessId/refunds-report", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const { dateFrom, dateTo, platform } = req.query;
    
    if (!dateFrom || !dateTo) {
      return res.status(400).json({ message: "dateFrom and dateTo are required" });
    }
    
    // Build the query based on platform filter
    let platformCondition = '';
    const params = [businessId, dateFrom, dateTo];
    
    if (platform && platform !== 'all') {
      platformCondition = 'AND platform = $4';
      params.push(platform);
    }
    
    const query = `
      SELECT 
        id,
        order_no as order_number,
        refund_date,
        COALESCE(refund_amount, 0)::float AS refund_amount,
        platform,
        customer_name,
        date_received
      FROM sheets 
      WHERE business_id = $1 
        AND refund_date IS NOT NULL
        AND refund_date >= $2 
        AND refund_date <= $3
        ${platformCondition}
      ORDER BY 
        platform ASC,
        refund_date ASC
    `;
    
    const { rows } = await pool.query(query, params);
    
    res.json(rows);
  } catch (err) {
    console.error("GET /api/sheets/:businessId/refunds-report error:", err);
    res.status(500).json({ message: "Failed to fetch refunds report data" });
  }
});

// GET /api/sheets/:businessId/history - Get all history for a business
router.get("/:businessId/history", authenticateToken, assertBusinessScope, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    const sheetId = req.query.sheetId ? Number(req.query.sheetId) : null;
    const history = await getSheetHistory(businessId, sheetId);
    res.json(history);
  } catch (err) {
    console.error("GET /api/sheets/:businessId/history error:", err);
    res.status(500).json({ message: "Failed to fetch sheet history" });
  }
});

module.exports = router;
