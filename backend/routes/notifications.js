const express = require('express');
const router = express.Router();
const pool = require('../lib/db');
const authenticateToken = require('../middleware/auth');

// Get all notifications for the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role.name;
    
    let query;
    let params;
    
    if (userRole === 'Superadmin') {
      // Superadmin sees all notifications
      query = `
        SELECT n.*, u.username as created_by_username, b.name as business_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN businesses b ON n.business_id = b.id
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
      params = [];
    } else {
      // Other users see notifications for their business or directed to them
      query = `
        SELECT n.*, u.username as created_by_username, b.name as business_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN businesses b ON n.business_id = b.id
        WHERE (n.user_id = $1 OR n.business_id = $2)
        ORDER BY n.created_at DESC
        LIMIT 50
      `;
      params = [userId, req.user.business_id];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get new notifications (unread notifications created in the last check)
router.get('/new', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role.name;
    const lastCheck = req.query.since || new Date(Date.now() - 30000).toISOString(); // Default to 30 seconds ago
    
    let query;
    let params;
    
    if (userRole === 'Superadmin') {
      query = `
        SELECT n.*, u.username as created_by_username, b.name as business_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN businesses b ON n.business_id = b.id
        WHERE n.read = FALSE AND n.created_at > $1
        ORDER BY n.created_at DESC
      `;
      params = [lastCheck];
    } else {
      query = `
        SELECT n.*, u.username as created_by_username, b.name as business_name
        FROM notifications n
        LEFT JOIN users u ON n.user_id = u.id
        LEFT JOIN businesses b ON n.business_id = b.id
        WHERE (n.user_id = $1 OR n.business_id = $2) 
        AND n.read = FALSE 
        AND n.created_at > $3
        ORDER BY n.created_at DESC
      `;
      params = [userId, req.user.business_id, lastCheck];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching new notifications:', error);
    res.status(500).json({ error: 'Failed to fetch new notifications' });
  }
});

// Mark a notification as read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role.name;
    
    let query;
    let params;
    
    if (userRole === 'Superadmin') {
      query = 'UPDATE notifications SET read = TRUE, updated_at = CURRENT_TIMESTAMP WHERE id = $1';
      params = [notificationId];
    } else {
      query = `
        UPDATE notifications 
        SET read = TRUE, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1 AND (user_id = $2 OR business_id = $3)
      `;
      params = [notificationId, userId, req.user.business_id];
    }

    const result = await pool.query(query, params);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Notification not found or access denied' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role.name;
    
    let query;
    let params;
    
    if (userRole === 'Superadmin') {
      query = 'UPDATE notifications SET read = TRUE, updated_at = CURRENT_TIMESTAMP WHERE read = FALSE';
      params = [];
    } else {
      query = `
        UPDATE notifications 
        SET read = TRUE, updated_at = CURRENT_TIMESTAMP 
        WHERE read = FALSE AND (user_id = $1 OR business_id = $2)
      `;
      params = [userId, req.user.business_id];
    }

    await pool.query(query, params);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// Helper function to create notifications (used by other routes)
const createNotification = async (type, enquiryId, orderNumber, status, businessId, message, targetUserId = null) => {
  try {
    const query = `
      INSERT INTO notifications (type, enquiry_id, order_number, status, business_id, message, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const params = [type, enquiryId, orderNumber, status, businessId, message, targetUserId];
    const result = await pool.query(query, params);
    return result.rows[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

module.exports = { router, createNotification };