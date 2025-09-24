const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const pool = require("../lib/db");
require("dotenv").config();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// DB roles -> UI labels
const roleNameMap = {
  SuperAdmin: "Superadmin",
  BusinessAdmin: "Business Admin",
  User: "User",
};

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ message: "username and password are required" });
    }

    // include business_id so frontend guard can compare
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

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user.id, role_id: user.role_id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const roleForFrontend = roleNameMap[user.role_name] || user.role_name;

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        business_id: user.business_id ?? null, // important for Business Admin and User
        role: { name: roleForFrontend },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
