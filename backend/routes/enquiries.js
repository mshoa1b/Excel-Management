// routes/enquiries.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { ROLE } = require("../lib/roles");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and text files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images, PDF, and text files are allowed'), false);
    }
  }
});

// GET /api/enquiries - Get all enquiries (filtered by business for non-superadmin)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;

    let query = `
      SELECT 
        e.id, e.status, e.enquiry_date, e.order_number, e.platform, 
        e.description, e.business_id, e.created_by, e.created_at, e.updated_at,
        b.name as business_name,
        u.username as created_by_username
      FROM enquiries e
      LEFT JOIN businesses b ON e.business_id = b.id
      LEFT JOIN users u ON e.created_by = u.id
    `;
    
    let params = [];
    
    // If not superadmin, filter by business
    if (myRole !== ROLE.SUPER_ADMIN) {
      query += " WHERE e.business_id = $1";
      params.push(myBiz);
    }
    
    query += " ORDER BY e.created_at DESC";

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("GET /api/enquiries error:", err);
    res.status(500).json({ message: "Failed to fetch enquiries" });
  }
});

// GET /api/enquiries/:id - Get specific enquiry with messages
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const enquiryId = parseInt(req.params.id);
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;

    // Get enquiry details
    let enquiryQuery = `
      SELECT 
        e.id, e.status, e.enquiry_date, e.order_number, e.platform, 
        e.description, e.business_id, e.created_by, e.created_at, e.updated_at,
        b.name as business_name,
        u.username as created_by_username
      FROM enquiries e
      LEFT JOIN businesses b ON e.business_id = b.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = $1
    `;
    
    let params = [enquiryId];
    
    // If not superadmin, ensure they can only see their business enquiries
    if (myRole !== ROLE.SUPER_ADMIN) {
      enquiryQuery += " AND e.business_id = $2";
      params.push(myBiz);
    }

    const { rows: enquiryRows } = await pool.query(enquiryQuery, params);
    
    if (enquiryRows.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    const enquiry = enquiryRows[0];

    // Get messages for this enquiry
    const messagesQuery = `
      SELECT 
        m.id, m.message, m.attachments, m.created_by, m.created_at,
        u.username as created_by_username
      FROM enquiry_messages m
      LEFT JOIN users u ON m.created_by = u.id
      WHERE m.enquiry_id = $1
      ORDER BY m.created_at ASC
    `;

    const { rows: messages } = await pool.query(messagesQuery, [enquiryId]);

    res.json({
      ...enquiry,
      messages
    });
  } catch (err) {
    console.error("GET /api/enquiries/:id error:", err);
    res.status(500).json({ message: "Failed to fetch enquiry details" });
  }
});

// POST /api/enquiries - Create new enquiry
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { order_number, platform, description, business_id } = req.body;
    const createdBy = req.user.id;
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;

    // Validation
    if (!order_number || !platform || !description) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (description.length > 2000) {
      return res.status(400).json({ message: "Description too long (max 2000 characters)" });
    }

    if (!['amazon', 'backmarket'].includes(platform)) {
      return res.status(400).json({ message: "Invalid platform" });
    }

    // Determine business_id and status
    let targetBusinessId;
    let initialStatus;

    if (myRole === ROLE.SUPER_ADMIN) {
      // Superadmin creating enquiry to business
      targetBusinessId = business_id || myBiz;
      initialStatus = 'Awaiting Business';
    } else {
      // Business user creating enquiry to Techezm
      targetBusinessId = myBiz;
      initialStatus = 'Awaiting Techezm';
    }

    const query = `
      INSERT INTO enquiries (status, order_number, platform, description, business_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, status, enquiry_date, order_number, platform, description, business_id, created_by, created_at, updated_at
    `;

    const { rows } = await pool.query(query, [
      initialStatus,
      order_number,
      platform,
      description,
      targetBusinessId,
      createdBy
    ]);

    // Create initial message in the conversation
    const messageQuery = `
      INSERT INTO enquiry_messages (enquiry_id, message, created_by)
      VALUES ($1, $2, $3)
    `;

    await pool.query(messageQuery, [
      rows[0].id,
      description, // Initial message is the description
      createdBy
    ]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/enquiries error:", err);
    res.status(500).json({ message: "Failed to create enquiry" });
  }
});

// POST /api/enquiries/:id/messages - Add message to enquiry
router.post("/:id/messages", authenticateToken, async (req, res) => {
  try {
    const enquiryId = parseInt(req.params.id);
    const { message } = req.body;
    const createdBy = req.user.id;
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Verify user has access to this enquiry
    let checkQuery = "SELECT id, business_id, status FROM enquiries WHERE id = $1";
    let checkParams = [enquiryId];
    
    if (myRole !== ROLE.SUPER_ADMIN) {
      checkQuery += " AND business_id = $2";
      checkParams.push(myBiz);
    }

    const { rows: enquiryRows } = await pool.query(checkQuery, checkParams);
    
    if (enquiryRows.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    const enquiry = enquiryRows[0];

    // Add the message
    const messageQuery = `
      INSERT INTO enquiry_messages (enquiry_id, message, created_by)
      VALUES ($1, $2, $3)
      RETURNING id, message, created_by, created_at
    `;

    const { rows: messageRows } = await pool.query(messageQuery, [enquiryId, message.trim(), createdBy]);

    // Update enquiry status based on who is responding
    let newStatus;
    if (myRole === ROLE.SUPER_ADMIN) {
      newStatus = 'Awaiting Business';
    } else {
      newStatus = 'Awaiting Techezm';
    }

    await pool.query(
      "UPDATE enquiries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newStatus, enquiryId]
    );

    res.status(201).json(messageRows[0]);
  } catch (err) {
    console.error("POST /api/enquiries/:id/messages error:", err);
    res.status(500).json({ message: "Failed to add message" });
  }
});

// PUT /api/enquiries/:id/status - Update enquiry status
router.put("/:id/status", authenticateToken, async (req, res) => {
  try {
    const enquiryId = parseInt(req.params.id);
    const { status } = req.body;
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;

    if (!['Awaiting Business', 'Awaiting Techezm', 'Resolved'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Verify user has access to this enquiry
    let checkQuery = "SELECT id, business_id FROM enquiries WHERE id = $1";
    let checkParams = [enquiryId];
    
    if (myRole !== ROLE.SUPER_ADMIN) {
      checkQuery += " AND business_id = $2";
      checkParams.push(myBiz);
    }

    const { rows: enquiryRows } = await pool.query(checkQuery, checkParams);
    
    if (enquiryRows.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    // Update status
    const updateQuery = `
      UPDATE enquiries 
      SET status = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
      RETURNING id, status, updated_at
    `;

    const { rows } = await pool.query(updateQuery, [status, enquiryId]);

    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/enquiries/:id/status error:", err);
    res.status(500).json({ message: "Failed to update enquiry status" });
  }
});

// POST /api/enquiries/:id/attachments - Upload files for enquiry
router.post("/:id/attachments", authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const enquiryId = parseInt(req.params.id);
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    // Verify user has access to this enquiry
    let checkQuery = "SELECT id, business_id FROM enquiries WHERE id = $1";
    let checkParams = [enquiryId];
    
    if (myRole !== ROLE.SUPER_ADMIN) {
      checkQuery += " AND business_id = $2";
      checkParams.push(myBiz);
    }

    const { rows: enquiryRows } = await pool.query(checkQuery, checkParams);
    
    if (enquiryRows.length === 0) {
      return res.status(404).json({ message: "Enquiry not found" });
    }

    // In a real implementation, you would save files to cloud storage (AWS S3, etc.)
    // For now, we'll simulate this by storing file metadata
    const fileMetadata = req.files.map(file => ({
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date().toISOString()
    }));

    // Store attachment info in the latest message or create a new message
    const messageQuery = `
      INSERT INTO enquiry_messages (enquiry_id, message, attachments, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, message, attachments, created_by, created_at
    `;

    const { rows: messageRows } = await pool.query(messageQuery, [
      enquiryId,
      `Uploaded ${req.files.length} file(s)`,
      JSON.stringify(fileMetadata),
      req.user.id
    ]);

    res.status(201).json({
      message: "Files uploaded successfully",
      attachments: fileMetadata,
      messageId: messageRows[0].id
    });

  } catch (err) {
    console.error("POST /api/enquiries/:id/attachments error:", err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: "File size too large (max 10MB)" });
    }
    res.status(500).json({ message: "Failed to upload files" });
  }
});

module.exports = router;