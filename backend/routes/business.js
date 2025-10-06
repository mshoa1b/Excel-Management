// routes/businesses.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { ROLE } = require("../lib/roles");
const { createBusiness, getBusinesses } = require("../models/Business");

// GET /api/businesses
router.get("/", authenticateToken, async (req, res) => {
  try {
    const businesses = await getBusinesses();
    return res.json(businesses);
  } catch (err) {
    console.error("GET /api/businesses error:", {
      message: err.message,
      code: err.code,
      detail: err.detail,
      stack: err.stack
    });
    return res.status(500).json({ message: "Failed to fetch businesses" });
  }
});

// POST /api/businesses  (restrict to Superadmin = ROLE.SUPER_ADMIN = 7)
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (req.user.role_id !== ROLE.SUPER_ADMIN) {
      return res.status(403).json({ message: "Unauthorized" });
    }
    const business = await createBusiness(req.body);
    return res.status(201).json(business);
  } catch (err) {
    console.error("POST /api/businesses error:", err);
    return res.status(500).json({ message: "Failed to create business" });
  }
});

/**
 * NEW: GET /api/businesses/:businessId/users
 * Used by Superadmin view on /users to list users per business.
 * - Superadmin (7) can view any business
 * - Business Admin (8) can only view their own business
 */
router.get("/:businessId/users", authenticateToken, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    if (!Number.isFinite(businessId) || businessId <= 0) {
      return res.status(400).json({ message: "Invalid businessId" });
    }

    // RBAC
    if (req.user.role_id !== ROLE.SUPER_ADMIN && req.user.role_id !== ROLE.BUSINESS_ADMIN) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (req.user.role_id === ROLE.BUSINESS_ADMIN && req.user.business_id !== businessId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.role_id, u.business_id, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.business_id = $1
       ORDER BY u.id DESC`,
      [businessId]
    );

    const users = rows.map((r) => ({
      id: r.id,
      username: r.username,
      business_id: r.business_id,
      role: { id: r.role_id, name: r.role_name || "User" }
    }));

    return res.json(users);
  } catch (err) {
    console.error("GET /api/businesses/:businessId/users error:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

module.exports = router;
