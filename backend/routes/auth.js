const express = require("express");
const router = express.Router();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const pool = require("../lib/db");
const authenticateToken = require("../middleware/auth");
const { ROLE, ROLE_LABELS } = require("../lib/roles");
const { isSuperAdmin, requireRoles, scopeByBusiness } = require("../lib/rbac");

require("dotenv").config();

// ---------- JWT settings ----------
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not set in environment");
}
const JWT_BASE = {
  issuer: process.env.JWT_ISSUER || "auth",
  audience: process.env.JWT_AUDIENCE || "api"
};
const JWT_SIGN_OPTS = { ...JWT_BASE, expiresIn: "1d", algorithm: "HS256" };
const JWT_VERIFY_OPTS = { ...JWT_BASE, algorithms: ["HS256"] };

// ========== Helpers ==========
const shapeUser = (r) => ({
  id: r.id,
  username: r.username,
  business_id: r.business_id ? String(r.business_id) : null,
  role: {
    id: r.role_id,
    name: r.role_name ? (ROLE_LABELS[r.role_name] || r.role_name) : "User"
  }
});

const Q_USERS_ALL = `
  SELECT u.id, u.username, u.role_id, u.business_id, r.name AS role_name
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
  ORDER BY u.id DESC
`;
const Q_USERS_SCOPED = `
  SELECT u.id, u.username, u.role_id, u.business_id, r.name AS role_name
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
  WHERE u.business_id = $1
  ORDER BY u.id DESC
`;

// =====================================
// Auth
// =====================================

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    const { rows } = await pool.query(
      `
      SELECT
        u.id,
        u.username,
        u.password_hash,
        u.role_id,
        u.business_id,
        r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.username = $1
      LIMIT 1
      `,
      [username]
    );

    if (rows.length === 0 || !rows[0].password_hash) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id,
        username: user.username,
        business_id: user.business_id
      },
      JWT_SECRET,
      JWT_SIGN_OPTS
    );

    const roleForFrontend = ROLE_LABELS[user.role_name] || user.role_name;

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        business_id: user.business_id ? String(user.business_id) : null,
        role: { 
          id: user.role_id,
          name: roleForFrontend 
        }
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// =====================================
// Users
// =====================================

// GET /api/users  (SuperAdmin sees all, others see own business)
router.get(
  "/users",
  authenticateToken,
  scopeByBusiness(Q_USERS_ALL, Q_USERS_SCOPED),
  async (req, res) => {
    try {
      const { text, values } = req._scopedQuery;
      const { rows } = await pool.query(text, values);
      res.json(rows.map(shapeUser));
    } catch (err) {
      console.error("GET /api/users error:", err);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  }
);

// GET /api/users/mine  (users in my business)
router.get("/users/mine", authenticateToken, async (req, res) => {
  try {
    const bizId = req.user?.business_id;
    if (!bizId) return res.status(400).json({ message: "No business scope" });
    const { rows } = await pool.query(Q_USERS_SCOPED, [bizId]);
    res.json(rows.map(shapeUser));
  } catch (err) {
    console.error("GET /api/users/mine error:", err);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// POST /api/users  (SuperAdmin any business; BusinessAdmin only own business; cannot create SuperAdmin unless caller is SuperAdmin)
router.post("/users", authenticateToken, async (req, res) => {
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

    // Ensure business exists
    const b = await pool.query("SELECT id FROM businesses WHERE id = $1", [targetBizId]);
    if (b.rowCount === 0) return res.status(404).json({ message: "Business not found" });

    // Unique username
    const exists = await pool.query("SELECT 1 FROM users WHERE username = $1", [username]);
    if (exists.rowCount > 0) return res.status(409).json({ message: "Username already exists" });

    const hash = await bcrypt.hash(password, 10);
    const ins = await pool.query(
      `INSERT INTO users (username, password_hash, role_id, business_id)
       VALUES ($1,$2,$3,$4)
       RETURNING id, username, role_id, business_id`,
      [username, hash, role_id, targetBizId]
    );

    // Fetch role name for response
    const roleRes = await pool.query('SELECT name FROM roles WHERE id = $1', [role_id]);
    const roleName = roleRes.rows[0]?.name || 'User';

    res.status(201).json(shapeUser({ ...ins.rows[0], role_name: roleName }));
  } catch (err) {
    console.error("POST /api/users error:", err);
    // unique_violation -> friendly message
    if (err.code === "23505") {
      return res.status(409).json({ message: "User already exists" });
    }
    res.status(500).json({ message: "Failed to create user" });
  }
});

// DELETE /api/users/:userId  (SuperAdmin any; BusinessAdmin only own business, not SuperAdmins)
router.delete("/users/:userId", authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ message: "Invalid userId" });
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

// PATCH /api/users/:userId/password
// SuperAdmin: any user without old password
// BusinessAdmin: users in own business without old password
router.patch("/users/:userId/password", authenticateToken, async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const { new_password, confirm_password } = req.body || {};
    if (!userId) return res.status(400).json({ message: "Invalid userId" });
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

// PATCH /api/users/me/password  (any user, requires current_password)
router.patch("/users/me/password", authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body || {};
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({ message: "current_password, new_password, confirm_password required" });
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

// =====================================
// Businesses
// =====================================

// POST /api/businesses  (SuperAdmin only; optional initial_admin)
router.post("/businesses", authenticateToken, requireRoles(ROLE.SUPER_ADMIN), async (req, res) => {
  const client = await pool.connect();
  try {
    const { name, initial_admin } = req.body || {};
    if (!name) return res.status(400).json({ message: "name required" });

    await client.query("BEGIN");

    const insBiz = await client.query(
      `INSERT INTO businesses (name) VALUES ($1) RETURNING id, name, owner_id`,
      [name]
    );
    const biz = insBiz.rows[0];

    let ownerId = null;

    if (initial_admin?.username && initial_admin?.password) {
      const exists = await client.query(`SELECT 1 FROM users WHERE username = $1`, [initial_admin.username]);
      if (exists.rowCount > 0) throw new Error("Username already exists");

      const hash = await bcrypt.hash(initial_admin.password, 10);
      const insAdmin = await client.query(
        `INSERT INTO users (username, password_hash, role_id, business_id)
         VALUES ($1,$2,$3,$4) RETURNING id`,
        [initial_admin.username, hash, ROLE.BUSINESS_ADMIN, biz.id]
      );
      ownerId = insAdmin.rows[0].id;

      await client.query(`UPDATE businesses SET owner_id = $1 WHERE id = $2`, [ownerId, biz.id]);
    }

    await client.query("COMMIT");
    res.status(201).json({ id: biz.id, name: biz.name, owner_id: ownerId });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("POST /api/businesses", e);
    if (e.code === "23505") {
      return res.status(409).json({ message: "Business or user already exists" });
    }
    const msg = e.message === "Username already exists" ? e.message : "Failed to create business";
    const code = e.message === "Username already exists" ? 409 : 500;
    res.status(code).json({ message: msg });
  } finally {
    client.release();
  }
});

// GET /api/businesses  (SuperAdmin only)
router.get("/businesses", authenticateToken, requireRoles(ROLE.SUPER_ADMIN), async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.id, b.name, b.owner_id,
             COALESCE(u.username, NULL) AS owner_username,
             (SELECT COUNT(*) FROM users ux WHERE ux.business_id = b.id) AS user_count
      FROM businesses b
      LEFT JOIN users u ON u.id = b.owner_id
      ORDER BY b.id DESC
    `);
    res.json(rows);
  } catch (e) {
    console.error("GET /api/businesses", e);
    res.status(500).json({ message: "Failed to fetch businesses" });
  }
});

// PATCH /api/businesses/:businessId/admin  (SuperAdmin only)
router.patch("/businesses/:businessId/admin", authenticateToken, requireRoles(ROLE.SUPER_ADMIN), async (req, res) => {
  const client = await pool.connect();
  try {
    const businessId = Number(req.params.businessId);
    const { user_id } = req.body || {};
    if (!businessId || !user_id) return res.status(400).json({ message: "businessId and user_id required" });

    await client.query("BEGIN");

    const biz = await client.query(`SELECT id FROM businesses WHERE id = $1`, [businessId]);
    if (biz.rowCount === 0) throw new Error("Business not found");

    const u = await client.query(`SELECT id, business_id FROM users WHERE id = $1`, [user_id]);
    if (u.rowCount === 0) throw new Error("User not found");
    if (u.rows[0].business_id !== businessId) throw new Error("User not in this business");

    // If you want multiple BusinessAdmins per business, remove demotion block
    // Demote existing BusinessAdmins to User (optional rule)
    // const old = await client.query(
    //   `SELECT id FROM users WHERE business_id = $1 AND role_id = $2`,
    //   [businessId, ROLE.BUSINESS_ADMIN]
    // );
    // if (old.rowCount > 0) {
    //   await client.query(`UPDATE users SET role_id = $1 WHERE id = ANY($2::int[])`, [ROLE.USER, old.rows.map(r => r.id)]);
    // }

    // Promote the chosen user to BusinessAdmin and set as owner
    await client.query(`UPDATE users SET role_id = $1 WHERE id = $2`, [ROLE.BUSINESS_ADMIN, user_id]);
    await client.query(`UPDATE businesses SET owner_id = $1 WHERE id = $2`, [user_id, businessId]);

    await client.query("COMMIT");
    res.json({ message: "ok" });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("PATCH /api/businesses/:businessId/admin", e);
    const map = {
      "Business not found": 404,
      "User not found": 404,
      "User not in this business": 400
    };
    res.status(map[e.message] || 500).json({ message: e.message || "Failed to set admin" });
  } finally {
    client.release();
  }
});

// GET /api/businesses/:businessId/users  (SuperAdmin any business; others only their own)
router.get("/businesses/:businessId/users", authenticateToken, async (req, res) => {
  try {
    const businessId = Number(req.params.businessId);
    if (!businessId) return res.status(400).json({ message: "Invalid businessId" });

    if (!isSuperAdmin(req) && req.user.business_id !== businessId) {
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

    res.json(rows.map((r) => ({
      id: r.id,
      username: r.username,
      business_id: r.business_id,
      role: { id: r.role_id, name: r.role_name }
    })));
  } catch (e) {
    console.error("GET /api/businesses/:businessId/users", e);
    res.status(500).json({ message: "Failed to fetch users for business" });
  }
});

module.exports = router;
