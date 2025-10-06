const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../lib/db");

const router = express.Router();

// Initialize database with default data (run once after deployment)
router.post("/init", async (req, res) => {
  try {
    // Check if already initialized
    const roleCheck = await pool.query("SELECT COUNT(*) FROM roles");
    if (parseInt(roleCheck.rows[0].count) > 0) {
      return res.json({ message: "Database already initialized" });
    }

    // Create roles
    const rolesData = [
      { name: 'SuperAdmin', permissions: ['manage_business','manage_users','manage_sheets','view_stats'] },
      { name: 'BusinessAdmin', permissions: ['manage_sheets','view_stats'] },
      { name: 'User', permissions: ['view_sheets','view_stats'] }
    ];

    for (const role of rolesData) {
      await pool.query(
        `INSERT INTO roles (name, permissions) VALUES ($1, $2)`,
        [role.name, role.permissions]
      );
    }

    // Create default SuperAdmin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role_id) 
       VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'SuperAdmin'))`,
      ['admin', hashedPassword]
    );

    res.json({ 
      message: "Database initialized successfully",
      defaultLogin: { username: "admin", password: "admin123" }
    });

  } catch (error) {
    console.error('Init error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;