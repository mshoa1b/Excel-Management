const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");

// Map DB role names to your UI labels
const roleNameMap = {
  SuperAdmin: "Superadmin",
  BusinessAdmin: "Business Admin",
  User: "User"
};

// GET /api/users -> [{ id, username, business_id, role: { id, name } }]
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.role_id, u.business_id, r.name AS role_name
       FROM users u
       LEFT JOIN roles r ON r.id = u.role_id
       ORDER BY u.id DESC`
    );

    const shaped = rows.map(r => ({
      id: r.id,
      username: r.username,
      business_id: r.business_id,
      role: {
        id: r.role_id,
        name: roleNameMap[r.role_name] || r.role_name || "User"
      }
    }));

    return res.json(shaped);
  } catch (err) {
    console.error("GET /api/users error:", err);
    return res.status(500).json({ message: "Failed to fetch users" });
  }
});

module.exports = router;
