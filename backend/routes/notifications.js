const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");

// GET /api/notifications
router.get("/", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    // Fetch unread + last 50 read notifications
    const { rows } = await pool.query(
      `SELECT id, user_id, type, title, message, link, read, created_at, to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as timestamp FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 100`, 
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET /api/notifications error:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

// POST /api/notifications/:id/read
router.post("/:id/read", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    await pool.query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/notifications/:id/read error:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
});

// POST /api/notifications/read-all
router.post("/read-all", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1`,
      [userId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/notifications/read-all error:", err);
    res.status(500).json({ message: "Failed to mark all as read" });
  }
});

// Helper to create notification (exported for use in other routes)
const createNotification = async (userId, type, title, message, link) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1, $2, $3, $4, $5)`,
      [userId, type, title, message, link]
    );
  } catch (err) {
    console.error("createNotification error:", err);
  }
};

const notifyUsers = async (businessId, senderUsername, type, title, message, link) => {
  try {
    // 1. Fetch all users for this business
    // Note: This relies on users table having business_id or being linked to it.
    // Assuming a simple users table with business_id for now based on context.
    // If SuperAdmin (sender? or recipient?), we might need logic, but for now focus on Business vs CS context.
    const { rows: users } = await pool.query(
      "SELECT id, username FROM users WHERE business_id = $1", 
      [businessId]
    );

    if (users.length === 0) return;

    // 2. Logic:
    // If sender starts with 'cs', notify users needing business attention (who DON'T start with 'cs').
    // If sender does NOT start with 'cs', notify CS users (who DO start with 'cs').
    // If sender is null (System), notify Everyone? Or maybe just CS? Let's assume everyone for System for now unless specified.
    
    let targetUsers = [];
    
    const isSenderCS = senderUsername && senderUsername.toLowerCase().startsWith('cs');

    if (senderUsername) {
      if (isSenderCS) {
         // Sender is CS -> Notify Business users (No 'cs' prefix)
         targetUsers = users.filter(u => !u.username.toLowerCase().startsWith('cs'));
      } else {
         // Sender is Business -> Notify CS users (With 'cs' prefix)
         targetUsers = users.filter(u => u.username.toLowerCase().startsWith('cs'));
      }
    } else {
      // System message -> Notify everyone in business
      targetUsers = users;
    }

    // 3. Create notifications
    for (const user of targetUsers) {
      // Don't notify the sender themselves (though logic above mostly prevents this data-wise, standard check)
      if (user.username === senderUsername) continue;

      await createNotification(user.id, type, title, message, link);
    }

  } catch (error) {
    console.error('notifyUsers error:', error);
  }
};

module.exports = { router, createNotification, notifyUsers };
