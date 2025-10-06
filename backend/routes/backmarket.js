const express = require("express");
const router = express.Router();
const pool = require("../lib/db");
const authenticateToken = require("../middleware/auth");
const { ROLE } = require("../lib/roles");
const { seal, open } = require("../lib/secretbox");

// RBAC: SuperAdmin can manage any business; others only their own business
function assertBusinessScope(req, res, next) {
  const businessId = Number(req.params.businessId);
  if (!businessId) return res.status(400).json({ message: "Invalid businessId" });
  if (req.user?.role_id === ROLE.SUPER_ADMIN) return next();
  if (req.user?.business_id !== businessId) return res.status(403).json({ message: "Forbidden" });
  return next();
}

// Mask helper (show last 4 chars only)
const mask = (s) => (s && s.length > 4 ? `${"*".repeat(Math.max(0, s.length - 4))}${s.slice(-4)}` : s || "");

/**
 * GET /api/businesses/:businessId/backmarket/credentials
 * Returns masked credentials (never the raw secrets)
 */
router.get("/businesses/:businessId/backmarket/credentials",
  authenticateToken, assertBusinessScope,
  async (req, res) => {
    try {
      const businessId = Number(req.params.businessId);
      const q = await pool.query(
        `SELECT api_key_enc, api_secret_enc, updated_by, updated_at
         FROM backmarket_credentials WHERE business_id = $1`,
        [businessId]
      );
      if (q.rowCount === 0) return res.json({ exists: false });

      const api_key = open(q.rows[0].api_key_enc);
      const api_secret = open(q.rows[0].api_secret_enc);

      res.json({
        exists: true,
        api_key_masked: mask(api_key),
        api_secret_masked: api_secret ? mask(api_secret) : null,
        updated_by: q.rows[0].updated_by,
        updated_at: q.rows[0].updated_at
      });
    } catch (e) {
      console.error("GET creds error:", e);
      res.status(500).json({ message: "Failed to load credentials" });
    }
  }
);

/**
 * PUT /api/businesses/:businessId/backmarket/credentials
 * Upsert credentials (BusinessAdmin in own business OR SuperAdmin any business)
 * Body: { api_key: string, api_secret?: string }
 */
router.put("/businesses/:businessId/backmarket/credentials",
  authenticateToken, assertBusinessScope,
  async (req, res) => {
    try {
      const businessId = Number(req.params.businessId);
      const { api_key, api_secret } = req.body || {};
      if (!api_key || typeof api_key !== "string") {
        return res.status(400).json({ message: "api_key is required" });
      }

      const api_key_enc = seal(api_key);
      const api_secret_enc = api_secret ? seal(api_secret) : null;

      const up = await pool.query(
        `INSERT INTO backmarket_credentials (business_id, api_key_enc, api_secret_enc, updated_by, updated_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (business_id) DO UPDATE
           SET api_key_enc = EXCLUDED.api_key_enc,
               api_secret_enc = COALESCE(EXCLUDED.api_secret_enc, backmarket_credentials.api_secret_enc),
               updated_by = EXCLUDED.updated_by,
               updated_at = NOW()
         RETURNING updated_by, updated_at`,
        [businessId, api_key_enc, api_secret_enc, req.user.id]
      );

      res.json({
        message: "ok",
        updated_by: up.rows[0].updated_by,
        updated_at: up.rows[0].updated_at
      });
    } catch (e) {
      console.error("PUT creds error:", e);
      res.status(500).json({ message: "Failed to save credentials" });
    }
  }
);

/**
 * DELETE /api/businesses/:businessId/backmarket/credentials
 * Deletes credentials (BusinessAdmin own business OR SuperAdmin any business)
 */
router.delete("/businesses/:businessId/backmarket/credentials",
  authenticateToken, assertBusinessScope,
  async (req, res) => {
    try {
      const businessId = Number(req.params.businessId);
      await pool.query(`DELETE FROM backmarket_credentials WHERE business_id = $1`, [businessId]);
      res.json({ message: "deleted" });
    } catch (e) {
      console.error("DELETE creds error:", e);
      res.status(500).json({ message: "Failed to delete credentials" });
    }
  }
);

module.exports = router;
