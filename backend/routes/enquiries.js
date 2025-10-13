// routes/enquiries.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { ROLE } = require("../lib/roles");
const { createNotification } = require("./notifications");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Counter for files uploaded in the same millisecond
let fileCounter = 0;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate highly unique filename to prevent any collisions
    const timestamp = Date.now();
    const processId = process.pid;
    const randomBytes = crypto.randomBytes(8).toString('hex'); // 16 hex chars
    const counter = (++fileCounter).toString().padStart(4, '0'); // 4 digit counter
    
    // Sanitize and get extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt'];
    const safeExt = allowedExts.includes(ext) ? ext : '.bin';
    
    // Format: timestamp-processid-counter-randomhex.ext
    const uniqueFilename = `${timestamp}-${processId}-${counter}-${randomBytes}${safeExt}`;
    
    cb(null, uniqueFilename);
  }
});

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

// GET /api/enquiries - Get all enquiries with search and filtering
router.get("/", authenticateToken, async (req, res) => {
  try {
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;
    const { order_number, date_from, date_to, platform, status_filter } = req.query;

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
    
    let conditions = [];
    let params = [];
    let paramIndex = 1;
    
    // Business access filter
    if (myRole !== ROLE.SUPER_ADMIN) {
      conditions.push(`e.business_id = $${paramIndex}`);
      params.push(myBiz);
      paramIndex++;
    }
    
    // Order number search (case-insensitive partial match)
    if (order_number && order_number.trim()) {
      conditions.push(`LOWER(e.order_number) LIKE LOWER($${paramIndex})`);
      params.push(`%${order_number.trim()}%`);
      paramIndex++;
    }
    
    // Date range filter
    if (date_from) {
      conditions.push(`e.enquiry_date >= $${paramIndex}`);
      params.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      conditions.push(`e.enquiry_date <= $${paramIndex}`);
      params.push(date_to);
      paramIndex++;
    }
    
    // Platform filter
    if (platform && platform !== 'all') {
      conditions.push(`e.platform = $${paramIndex}`);
      params.push(platform);
      paramIndex++;
    }
    
    // Status filter
    if (status_filter && status_filter !== 'all') {
      if (status_filter === 'active') {
        // Default: non-resolved OR resolved within last 5 days
        conditions.push(`(e.status != 'Resolved' OR (e.status = 'Resolved' AND e.updated_at >= NOW() - INTERVAL '5 days'))`);
      } else if (status_filter === 'resolved') {
        conditions.push(`e.status = 'Resolved'`);
      } else if (status_filter === 'awaiting_business') {
        conditions.push(`e.status = 'Awaiting Business'`);
      } else if (status_filter === 'awaiting_techezm') {
        conditions.push(`e.status = 'Awaiting Techezm'`);
      }
    } else if (!status_filter || status_filter === 'active') {
      // Default behavior: exclude old resolved enquiries
      conditions.push(`(e.status != 'Resolved' OR (e.status = 'Resolved' AND e.updated_at >= NOW() - INTERVAL '5 days'))`);
    }
    
    // Add WHERE clause if there are conditions
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Order by creation date (newest first)
    query += " ORDER BY e.created_at DESC";

    console.log('Enquiries query:', query);
    console.log('Query params:', params);

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
    const { order_number, platform, description, business_id, status } = req.body;
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

    // Validate status
    const validStatuses = ['Awaiting Business', 'Awaiting Techezm'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Determine business_id and status
    let targetBusinessId;
    let initialStatus;

    if (myRole === ROLE.SUPER_ADMIN) {
      // Superadmin creating enquiry to business
      targetBusinessId = business_id || myBiz;
      initialStatus = status || 'Awaiting Business'; // Use provided status or default
    } else {
      // Business user creating enquiry - can choose status
      targetBusinessId = myBiz;
      initialStatus = status || 'Awaiting Business'; // Use provided status or default
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

    // Create notification for new enquiry
    const notificationMessage = `New enquiry created for order #${order_number}`;
    await createNotification(
      'new_enquiry', 
      rows[0].id, 
      order_number, 
      initialStatus, 
      targetBusinessId, 
      notificationMessage
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/enquiries error:", err);
    res.status(500).json({ message: "Failed to create enquiry" });
  }
});

// POST /api/enquiries/:id/messages - Add message to enquiry (with optional file uploads)
router.post("/:id/messages", authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    const enquiryId = parseInt(req.params.id);
    const { message } = req.body;
    const createdBy = req.user.id;
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;
    const files = req.files || [];

    // Validate message or files are provided
    if ((!message || message.trim().length === 0) && files.length === 0) {
      return res.status(400).json({ message: "Message or files are required" });
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

    // Process file attachments if any
    let attachments = null;
    if (files.length > 0) {
      attachments = files.map(file => {
        // Double-check file uniqueness (paranoid mode)
        let finalFilename = file.filename;
        let fullPath = path.join(uploadsDir, finalFilename);
        let attempts = 0;
        
        // If by some miracle there's still a collision, add more randomness
        while (fs.existsSync(fullPath) && attempts < 10) {
          const extraRandom = crypto.randomBytes(4).toString('hex');
          const ext = path.extname(file.filename);
          const nameWithoutExt = path.basename(file.filename, ext);
          finalFilename = `${nameWithoutExt}-${extraRandom}${ext}`;
          fullPath = path.join(uploadsDir, finalFilename);
          attempts++;
        }
        
        // If original filename was changed, rename the file
        if (finalFilename !== file.filename) {
          fs.renameSync(path.join(uploadsDir, file.filename), fullPath);
        }
        
        return {
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          filePath: finalFilename,
          uploadedAt: new Date().toISOString(),
          uniqueId: crypto.randomUUID()
        };
      });
    }

    // Add the message with attachments
    const messageQuery = `
      INSERT INTO enquiry_messages (enquiry_id, message, attachments, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, message, attachments, created_by, created_at
    `;

    const messageText = message?.trim() || (files.length > 0 ? `Sent ${files.length} file(s)` : '');
    const { rows: messageRows } = await pool.query(messageQuery, [
      enquiryId, 
      messageText, 
      attachments ? JSON.stringify(attachments) : null,
      createdBy
    ]);

    // Update enquiry status based on who is responding
    let newStatus;
    if (myRole === ROLE.SUPER_ADMIN) {
      newStatus = 'Awaiting Business';
    } else {
      newStatus = 'Awaiting Techezm';
    }

    const { rows: updatedEnquiry } = await pool.query(
      "UPDATE enquiries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING order_number, business_id",
      [newStatus, enquiryId]
    );

    // Create notification for status update due to new message
    const notificationMessage = `New message received - status updated to ${newStatus} for order #${updatedEnquiry[0].order_number}`;
    await createNotification(
      'status_update', 
      enquiryId, 
      updatedEnquiry[0].order_number, 
      newStatus, 
      updatedEnquiry[0].business_id, 
      notificationMessage
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
      RETURNING id, status, updated_at, order_number
    `;

    const { rows } = await pool.query(updateQuery, [status, enquiryId]);

    // Create notification for status update
    const notificationMessage = `Enquiry status updated to ${status} for order #${rows[0].order_number}`;
    await createNotification(
      'status_update', 
      enquiryId, 
      rows[0].order_number, 
      status, 
      enquiryRows[0].business_id, 
      notificationMessage
    );

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

    console.log('Attachment upload request:', {
      enquiryId,
      filesCount: req.files ? req.files.length : 0,
      files: req.files,
      body: req.body
    });

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

    // Store file metadata with actual file paths
    const fileMetadata = req.files.map(file => {
      // Double-check file uniqueness (paranoid mode)
      let finalFilename = file.filename;
      let fullPath = path.join(uploadsDir, finalFilename);
      let attempts = 0;
      
      // If by some miracle there's still a collision, add more randomness
      while (fs.existsSync(fullPath) && attempts < 10) {
        const extraRandom = crypto.randomBytes(4).toString('hex');
        const ext = path.extname(file.filename);
        const nameWithoutExt = path.basename(file.filename, ext);
        finalFilename = `${nameWithoutExt}-${extraRandom}${ext}`;
        fullPath = path.join(uploadsDir, finalFilename);
        attempts++;
      }
      
      // If original filename was changed, rename the file
      if (finalFilename !== file.filename) {
        fs.renameSync(path.join(uploadsDir, file.filename), fullPath);
      }
      
      return {
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        filePath: finalFilename, // Store the final unique filename
        uploadedAt: new Date().toISOString(),
        uniqueId: crypto.randomUUID() // Add a UUID for extra uniqueness tracking
      };
    });

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

// GET /api/enquiries/:id/attachments/:filename/download - Download attachment file
router.get("/:id/attachments/:filename/download", authenticateToken, async (req, res) => {
  try {
    const enquiryId = parseInt(req.params.id);
    const filename = req.params.filename;
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;

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

    // Verify the file belongs to this enquiry by checking messages
    const messageQuery = `
      SELECT attachments FROM enquiry_messages 
      WHERE enquiry_id = $1 AND attachments::text LIKE $2
    `;
    
    const { rows: messageRows } = await pool.query(messageQuery, [
      enquiryId, 
      `%"filePath":"${filename}"%`
    ]);

    console.log('Download request - messageRows found:', messageRows.length);
    if (messageRows.length > 0) {
      console.log('First row attachments:', typeof messageRows[0].attachments, messageRows[0].attachments);
    }

    if (messageRows.length === 0) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // Get the file from disk
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found on disk" });
    }

    // Find the original name from the attachments data
    let originalName = filename;
    for (const row of messageRows) {
      try {
        // Handle both string and object formats for attachments
        let attachments = row.attachments;
        if (typeof attachments === 'string') {
          attachments = JSON.parse(attachments);
        }
        
        if (Array.isArray(attachments)) {
          const attachment = attachments.find(att => att.filePath === filename);
          if (attachment) {
            originalName = attachment.originalName;
            break;
          }
        }
      } catch (parseError) {
        console.error('Error parsing attachments:', parseError, 'Row:', row.attachments);
        // Continue to next row if parsing fails
        continue;
      }
    }

    // Set the proper content type and send file
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.sendFile(filePath);

  } catch (err) {
    console.error("GET /api/enquiries/:id/attachments/:filename/download error:", err);
    res.status(500).json({ message: "Failed to download file" });
  }
});

module.exports = router;