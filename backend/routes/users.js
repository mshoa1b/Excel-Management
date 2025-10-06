// routes/users.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { ROLE, ROLE_LABELS } = require("../lib/roles");
const { isSuperAdmin, scopeByBusiness } = require("../lib/rbac");

const shapeUser = (r) => ({
  id: r.id,
  username: r.username,
  business_id: r.business_id,
  role: {
    id: r.role_id,
    name: r.role_name ? (ROLE_LABELS[r.role_name] || r.role_name) : "User",
  },
});

const Q_LIST_ALL = `
  SELECT u.id, u.username, u.role_id, u.business_id, r.name AS role_name
  FROM users u LEFT JOIN roles r ON r.id = u.role_id
  ORDER BY u.id DESC
`;
const Q_LIST_SCOPED = `
  SELECT u.id, u.username, u.role_id, u.business_id, r.name AS role_name
  FROM users u LEFT JOIN roles r ON r.id = u.role_id
  WHERE u.business_id = $1
  ORDER BY u.id DESC
`;

// GET /api/users
router.get("/", authenticateToken, scopeByBusiness(Q_LIST_ALL, Q_LIST_SCOPED), async (req, res) => {
  try {
    const { text, values } = req._scopedQuery;
    const { rows } = await pool.query(text, values);
    res.json(rows.map(shapeUser));
  } catch (err) {
    console.error("GET /api/users error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// GET /api/users/mine
router.get("/mine", authenticateToken, async (req, res) => {
  try {
    const bizId = req.user?.business_id;
    if (!bizId) return res.status(400).json({ message: "No business scope" });
    const { rows } = await pool.query(Q_LIST_SCOPED, [bizId]);
    res.json(rows.map(shapeUser));
  } catch (err) {
    console.error("GET /api/users/mine error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// POST /api/users
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { username, password, role_id, business_id } = req.body || {};
    if (!username || !password || !role_id) {
      return res.status(400).json({ message: "username, password, role_id required" });
    }
    if (![ROLE.SUPER_ADMIN, ROLE.BUSINESS_ADMIN, ROLE.USER].includes(Number(role_id))) {
      return res.status(400).json({ message: "Invalid role_id" });
    }

    let targetBizId = business_id;
    if (!isSuperAdmin(req)) {
      if (Number(role_id) === ROLE.SUPER_ADMIN) {
        return res.status(403).json({ message: "Cannot create SuperAdmin" });
      }
      targetBizId = req.user.business_id;
    }
    if (!targetBizId) return res.status(400).json({ message: "business_id required" });

    const b = await pool.query("SELECT id FROM businesses WHERE id = $1", [targetBizId]);
    if (b.rowCount === 0) return res.status(404).json({ message: "Business not found" });

    const exists = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
    if (exists.rowCount > 0) return res.status(409).json({ message: "Username already exists" });

    const hash = await bcrypt.hash(password, 10);
    const ins = await pool.query(
      `INSERT INTO users (username, password_hash, role_id, business_id)
       VALUES ($1,$2,$3,$4)
       RETURNING id, username, role_id, business_id`,
      [username, hash, role_id, targetBizId]
    );

    res.status(201).json(shapeUser({ ...ins.rows[0], role_name: null }));
  } catch (err) {
    console.error("POST /api/users error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// DELETE /api/users/:userId
router.delete("/:userId", authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid userId" });
    }
    if (userId === req.user.id) return res.status(400).json({ message: "Cannot delete yourself" });

    const { rows } = await pool.query(
      `SELECT id, role_id, business_id FROM users WHERE id = $1`,
      [userId]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const target = rows[0];

    if (!isSuperAdmin(req)) {
      if (target.business_id !== req.user.business_id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      if (target.role_id === ROLE.SUPER_ADMIN) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
    res.json({ message: "ok" });
  } catch (err) {
    console.error("DELETE /api/users/:userId error:", err);
    res.status(500).json({ message: "Failed to delete user" });
  }
});

/** -------------------- PASSWORD ROUTES -------------------- **
 * IMPORTANT:
 * - Place /me/password BEFORE /:userId/password
 * - We do NOT use inline regex in the path (to avoid path-to-regexp crashes)
 * - Validate numeric userId inside the handler
 */

// PATCH /api/users/me/password  (self-change)
router.patch("/me/password", authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password || !new_password || !confirm_password) {
      return res
        .status(400)
        .json({ message: "current_password, new_password, confirm_password required" });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const u = await pool.query(`SELECT id, password_hash FROM users WHERE id = $1`, [req.user.id]);
    if (u.rowCount === 0) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(current_password, u.rows[0].password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid current password" });

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, req.user.id]);
    res.json({ message: "ok" });
  } catch (err) {
    console.error("PATCH /api/users/me/password error:", err);
    res.status(500).json({ message: "Failed to update password" });
  }
});

// PATCH /api/users/:userId/password  (admin changes someone else)
router.patch("/:userId/password", authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { new_password, confirm_password } = req.body || {};

    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(400).json({ message: "Invalid userId" });
    }
    if (!new_password || !confirm_password) {
      return res.status(400).json({ message: "new_password and confirm_password required" });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    const q = await pool.query(`SELECT id, business_id FROM users WHERE id = $1`, [userId]);
    if (q.rowCount === 0) return res.status(404).json({ message: "User not found" });

    if (!isSuperAdmin(req)) {
      if (q.rows[0].business_id !== req.user.business_id) {
        return res.status(403).json({ message: "Forbidden" });
      }
    }

    const hash = await bcrypt.hash(new_password, 10);
    await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [hash, userId]);
    res.json({ message: "ok" });
  } catch (err) {
    console.error("PATCH /api/users/:userId/password error:", err);
    res.status(500).json({ message: "Failed to update password" });
  }
});

module.exports = router;
