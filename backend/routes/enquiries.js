// routes/enquiries.js
const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const pool = require("../lib/db");
const { notifyUsers } = require("./notifications");
const { ROLE } = require("../lib/roles");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads (using memory storage for SFTP)
const fs = require('fs');
const crypto = require('crypto');
const sftpManager = require('../lib/sftp');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, PDFs, and text files
    console.log('File upload attempt:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    // More permissive image type checking
    if (file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype === 'text/plain') {
      cb(null, true);
    } else {
      console.log('File rejected due to unsupported MIME type:', file.mimetype);
      cb(new Error(`Unsupported file type: ${file.mimetype}. Only images, PDF, and text files are allowed.`), false);
    }
  }
});

// GET /api/enquiries - Get all enquiries with search and filtering
router.get("/", authenticateToken, async (req, res) => {
  try {
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;
    const { order_number, date_from, date_to, platform, status_filter, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let selectClause = `
      SELECT 
        e.id, e.status, e.enquiry_date, e.order_number, e.platform, 
        e.description, e.business_id, e.created_by, e.created_at, e.updated_at,
        b.name as business_name,
        u.username as created_by_username,
        COALESCE(lm.created_at, e.created_at) as last_update_at,
        COALESCE(lm_u.username, u.username) as last_update_by
    `;

    let fromClause = `
      FROM enquiries e
      LEFT JOIN businesses b ON e.business_id = b.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN LATERAL (
        SELECT created_at, created_by
        FROM enquiry_messages
        WHERE enquiry_id = e.id
        ORDER BY created_at DESC
        LIMIT 1
      ) lm ON true
      LEFT JOIN users lm_u ON lm.created_by = lm_u.id
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
    let statusCondition = null;
    if (status_filter && status_filter !== 'all') {
      if (status_filter === 'active') {
        // Default: Only Awaiting... (exclude Resolved)
        statusCondition = `e.status != 'Resolved'`;
      } else if (status_filter === 'resolved') {
        statusCondition = `e.status = 'Resolved'`;
      } else if (status_filter === 'awaiting_business') {
        statusCondition = `e.status = 'Awaiting Business'`;
      } else if (status_filter === 'awaiting_techezm') {
        statusCondition = `e.status = 'Awaiting Techezm'`;
      }
    } else if (!status_filter || status_filter === 'active') {
      // Default behavior: Only Awaiting... (exclude Resolved)
      statusCondition = `e.status != 'Resolved'`;
    }

    // Base WHERE clause (without status) for stats
    let baseWhereClause = "";
    if (conditions.length > 0) {
      baseWhereClause = ` WHERE ${conditions.join(' AND ')}`;
    }

    // Full WHERE clause (with status) for data
    let fullWhereClause = baseWhereClause;
    if (statusCondition) {
      fullWhereClause += (baseWhereClause ? " AND " : " WHERE ") + statusCondition;
    }

    // Stats query (counts by status, ignoring status filter but respecting others)
    const statsQuery = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'Resolved') as resolved,
        COUNT(*) FILTER (WHERE status = 'Awaiting Business') as awaiting_business,
        COUNT(*) FILTER (WHERE status = 'Awaiting Techezm') as awaiting_techezm,
        COUNT(*) FILTER (WHERE platform = 'amazon' AND status != 'Resolved') as amazon,
        COUNT(*) FILTER (WHERE platform = 'backmarket' AND status != 'Resolved') as backmarket,
        COUNT(*) as total
      ${fromClause} ${baseWhereClause}
    `;
    
    // We need to use a separate params array for stats because the main query adds limit/offset
    const statsResult = await pool.query(statsQuery, params);
    const stats = {
      resolved: parseInt(statsResult.rows[0].resolved || 0),
      awaitingBusiness: parseInt(statsResult.rows[0].awaiting_business || 0),
      awaitingTechezm: parseInt(statsResult.rows[0].awaiting_techezm || 0),
      amazon: parseInt(statsResult.rows[0].amazon || 0),
      backmarket: parseInt(statsResult.rows[0].backmarket || 0),
      total: parseInt(statsResult.rows[0].total || 0)
    };

    // Count query for pagination (respects all filters including status)
    const countQuery = `SELECT COUNT(*) ${fromClause} ${fullWhereClause}`;
    const countResult = await pool.query(countQuery, params);
    const totalFiltered = parseInt(countResult.rows[0].count);

    // Determine sort order based on username
    const username = req.user?.username || '';
    let orderByClause = "";
    
    if (username.toLowerCase().startsWith('cs')) {
      // CS users see 'Awaiting Techezm' first
      orderByClause = "ORDER BY CASE WHEN e.status = 'Awaiting Techezm' THEN 0 ELSE 1 END, e.created_at DESC";
    } else {
      // Other users (Businesses) see 'Awaiting Business' first
      orderByClause = "ORDER BY CASE WHEN e.status = 'Awaiting Business' THEN 0 ELSE 1 END, e.created_at DESC";
    }

    // Data query
    let query = `${selectClause} ${fromClause} ${fullWhereClause} ${orderByClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    
    // Add limit and offset to params
    const queryParams = [...params, limitNum, offset];

    const { rows } = await pool.query(query, queryParams);
    
    res.json({
      data: rows,
      stats,
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalFiltered / limitNum)
      }
    });
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

    // Check if an enquiry already exists for this order number
    const existingEnquiryQuery = `
      SELECT id FROM enquiries 
      WHERE order_number = $1 AND business_id = $2
      LIMIT 1
    `;

    console.log('Checking for existing enquiry:', { order_number, targetBusinessId });
    const existingResult = await pool.query(existingEnquiryQuery, [order_number, targetBusinessId]);

    if (existingResult.rows.length > 0) {
      console.log('Found existing enquiry:', existingResult.rows[0]);
      return res.status(409).json({
        error: 'Enquiry already exists for this order number',
        existingEnquiryId: existingResult.rows[0].id
      });
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


    // Notify relevant users
    // If SuperAdmin created it, notify Business users? Or system default?
    // Usually Business User creates enquiry -> Notify CS
    // If CS creates enquiry (?) -> Notify Business
    await notifyUsers(
      targetBusinessId,
      req.user.username,
      'info',
      `New Enquiry: ${order_number}`,
      `New enquiry created by ${req.user.username}`,
      `/enquiries/${rows[0].id}`
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
    let checkQuery = "SELECT id, business_id, status, order_number FROM enquiries WHERE id = $1";
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
      attachments = [];

      for (const file of files) {
        try {
          console.log('Processing message file:', file.originalname, 'Size:', file.size);

          // Generate unique filename
          const fileExtension = path.extname(file.originalname);
          const timestamp = Date.now();
          const randomString = crypto.randomBytes(6).toString('hex');
          const filename = `message_${timestamp}_${randomString}${fileExtension}`;

          console.log('Generated filename for message:', filename);

          // Upload to SFTP (use enquiryId as sheetId for folder organization)
          console.log('Starting SFTP upload for message attachment...');
          const sftpPath = await sftpManager.uploadFile(
            file.buffer,
            enquiry.business_id, // Use business_id from the enquiry
            enquiryId, // Use enquiry ID for folder organization
            filename
          );
          console.log('SFTP upload completed for message attachment, path:', sftpPath);

          attachments.push({
            originalName: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            filename: filename, // Store the unique filename
            sftpPath: sftpPath, // Store the SFTP path
            uploadedAt: new Date().toISOString(),
            uniqueId: crypto.randomUUID()
          });
        } catch (uploadError) {
          console.error('Error uploading message file:', file.originalname, uploadError);
          throw new Error(`Failed to upload file ${file.originalname}: ${uploadError.message}`);
        }
      }
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


    // Notify relevant users
    //console.log('DEBUG NOTIFICATION: enquiry=', enquiry);
    //console.log('DEBUG NOTIFICATION: updatedEnquiry=', updatedEnquiry[0]);

    const orderNo = updatedEnquiry[0]?.order_number || enquiry.order_number || 'Unknown Order';

    await notifyUsers(
      enquiry.business_id,
      req.user.username,
      'info',
      `New Reply: ${orderNo}`,
      `New reply from ${req.user.username}`,
      `/enquiries/${enquiryId}`
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

    res.json(rows[0]);
  } catch (err) {
    console.error("PUT /api/enquiries/:id/status error:", err);
    res.status(500).json({ message: "Failed to update enquiry status" });
  }
});

// POST /api/enquiries/:id/attachments - Upload files for enquiry
router.post("/:id/attachments", authenticateToken, upload.array('files', 5), async (req, res) => {
  console.log('Enquiry attachment upload endpoint hit');

  try {
    const enquiryId = parseInt(req.params.id);
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;

    console.log('Attachment upload request:', {
      enquiryId,
      filesCount: req.files ? req.files.length : 0,
      files: req.files ? req.files.map(f => ({
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })) : [],
      body: req.body,
      user: { id: req.user.id, role: myRole, business: myBiz }
    });

    if (!req.files || req.files.length === 0) {
      console.log('No files in request');
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

    // Upload files to SFTP and store metadata
    const fileMetadata = [];

    for (const file of req.files) {
      try {
        console.log('Processing enquiry file:', file.originalname, 'Size:', file.size);

        // Generate unique filename
        const fileExtension = path.extname(file.originalname);
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(6).toString('hex');
        const filename = `enquiry_${timestamp}_${randomString}${fileExtension}`;

        console.log('Generated filename for enquiry:', filename);

        // Upload to SFTP (use enquiryId as a pseudo-sheetId for folder organization)
        console.log('Starting SFTP upload for enquiry attachment...');
        const sftpPath = await sftpManager.uploadFile(
          file.buffer,
          enquiryRows[0].business_id, // Use business_id from the enquiry
          enquiryId, // Use enquiry ID for folder organization
          filename
        );
        console.log('SFTP upload completed for enquiry attachment, path:', sftpPath);

        fileMetadata.push({
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          filename: filename, // Store the unique filename
          sftpPath: sftpPath, // Store the SFTP path
          uploadedAt: new Date().toISOString(),
          uniqueId: crypto.randomUUID() // Add a UUID for extra uniqueness tracking
        });
      } catch (uploadError) {
        console.error('Error uploading enquiry file:', file.originalname, uploadError);
        throw new Error(`Failed to upload file ${file.originalname}: ${uploadError.message}`);
      }
    }

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
      `%"filename":"${filename}"%`
    ]);

    console.log('Download request - messageRows found:', messageRows.length);
    if (messageRows.length > 0) {
      console.log('First row attachments:', typeof messageRows[0].attachments, messageRows[0].attachments);
    }

    if (messageRows.length === 0) {
      return res.status(404).json({ message: "Attachment not found" });
    }

    // Find the attachment metadata including SFTP path and original name
    let attachmentData = null;
    for (const row of messageRows) {
      try {
        // Handle both string and object formats for attachments
        let attachments = row.attachments;
        if (typeof attachments === 'string') {
          attachments = JSON.parse(attachments);
        }

        if (Array.isArray(attachments)) {
          const attachment = attachments.find(att => att.filename === filename);
          if (attachment) {
            attachmentData = attachment;
            break;
          }
        }
      } catch (parseError) {
        console.error('Error parsing attachments:', parseError, 'Row:', row.attachments);
        continue;
      }
    }

    if (!attachmentData || !attachmentData.sftpPath) {
      return res.status(404).json({ message: "Attachment metadata not found" });
    }

    // Download file from SFTP
    console.log('Downloading file from SFTP:', attachmentData.sftpPath);
    const fileBuffer = await sftpManager.downloadFile(attachmentData.sftpPath);

    // Set proper headers and send file
    res.setHeader('Content-Disposition', `attachment; filename="${attachmentData.originalName}"`);
    res.setHeader('Content-Type', attachmentData.mimetype || 'application/octet-stream');
    res.setHeader('Content-Length', fileBuffer.length);
    res.send(fileBuffer);

  } catch (err) {
    console.error("GET /api/enquiries/:id/attachments/:filename/download error:", err);
    res.status(500).json({ message: "Failed to download file" });
  }
});

// GET /api/enquiries/debug/:order_number - Debug endpoint to find conflicting enquiries
router.get("/debug/:order_number", authenticateToken, async (req, res) => {
  try {
    const { order_number } = req.params;
    const myBiz = req.user?.business_id;

    if (!order_number) {
      return res.status(400).json({ message: "Order number is required" });
    }

    const query = `
      SELECT 
        e.id, e.status, e.enquiry_date, e.order_number, e.platform, 
        e.description, e.business_id, e.created_by, e.created_at, e.updated_at,
        b.name as business_name,
        u.username as created_by_username
      FROM enquiries e
      LEFT JOIN businesses b ON e.business_id = b.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.order_number = $1 AND e.business_id = $2
      ORDER BY e.created_at DESC
    `;

    const { rows } = await pool.query(query, [order_number, myBiz]);

    res.json({
      order_number,
      business_id: myBiz,
      existing_enquiries: rows,
      count: rows.length
    });
  } catch (err) {
    console.error("GET /api/enquiries/debug error:", err);
    res.status(500).json({ message: "Failed to debug enquiries" });
  }
});

// GET /api/enquiries/bulk-counts - Get enquiry counts for multiple order numbers
router.post("/bulk-counts", authenticateToken, async (req, res) => {
  try {
    const myRole = req.user?.role_id;
    const myBiz = req.user?.business_id;
    const { order_numbers } = req.body;

    if (!order_numbers || !Array.isArray(order_numbers) || order_numbers.length === 0) {
      return res.status(400).json({ message: "order_numbers array is required" });
    }

    // Build query with placeholders for order numbers
    const placeholders = order_numbers.map((_, index) => `$${index + 2}`).join(', ');
    const query = `
      SELECT 
        order_number,
        COUNT(*) as count
      FROM enquiries e
      WHERE e.business_id = $1 
        AND e.order_number IN (${placeholders})
        AND (e.status != 'Resolved' OR (e.status = 'Resolved' AND e.updated_at >= NOW() - INTERVAL '5 days'))
      GROUP BY order_number
    `;

    const params = [myBiz, ...order_numbers];

    const result = await pool.query(query, params);

    // Create counts object with all order numbers (defaulting to 0)
    const counts = {};
    order_numbers.forEach(orderNumber => {
      counts[orderNumber] = 0;
    });

    // Update with actual counts
    result.rows.forEach(row => {
      counts[row.order_number] = parseInt(row.count);
    });

    res.json(counts);
  } catch (err) {
    console.error("POST /api/enquiries/bulk-counts error:", err);
    res.status(500).json({ message: "Failed to get enquiry counts" });
  }
});

module.exports = router;