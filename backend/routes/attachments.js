const express = require('express');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const authenticateToken = require('../middleware/auth');
const sftpManager = require('../lib/sftp');
const {
  createAttachment,
  getAttachmentsBySheetId,
  getAttachmentById,
  deleteAttachment,
  getAttachmentCountBySheetId
} = require('../models/Attachment');

const router = express.Router();

// Configure multer for memory storage (we'll upload to SFTP)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common image and document types
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/tiff',
      'application/pdf',
      'text/plain'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Only images and PDFs are supported.'), false);
    }
  }
});

// POST /api/attachments/upload/:sheetId
router.post('/upload/:sheetId', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    const sheetId = parseInt(req.params.sheetId);
    const files = req.files;
    const businessId = req.user.business_id;
    const userId = req.user.id;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    // Check current attachment count
    const currentCount = await getAttachmentCountBySheetId(sheetId);
    if (currentCount + files.length > 10) {
      return res.status(400).json({ 
        message: `Cannot upload ${files.length} files. Maximum 10 files per row. Current: ${currentCount}` 
      });
    }

    const uploadedAttachments = [];

    for (const file of files) {
      try {
        console.log('Processing file:', file.originalname, 'Size:', file.size);
        
        // Generate unique filename
        const fileExtension = path.extname(file.originalname);
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(6).toString('hex');
        const filename = `${timestamp}_${randomString}${fileExtension}`;
        
        console.log('Generated filename:', filename);

        // Upload to SFTP
        console.log('Starting SFTP upload...');
        const sftpPath = await sftpManager.uploadFile(
          file.buffer,
          businessId,
          sheetId,
          filename
        );
        console.log('SFTP upload completed, path:', sftpPath);

        // Save attachment metadata to database
        console.log('Saving to database...');
        const attachment = await createAttachment({
          sheet_id: sheetId,
          business_id: businessId,
          filename: filename,
          original_name: file.originalname,
          file_size: file.size,
          mime_type: file.mimetype,
          sftp_path: sftpPath,
          uploaded_by: userId
        });
        console.log('Database save completed');

        uploadedAttachments.push(attachment);
      } catch (fileError) {
        console.error(`Failed to upload file ${file.originalname}:`, fileError);
        // Continue with other files
      }
    }

    res.json({
      message: `Successfully uploaded ${uploadedAttachments.length} of ${files.length} files`,
      attachments: uploadedAttachments
    });
  } catch (error) {
    console.error('Upload error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to upload files', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/attachments/sheet/:sheetId
router.get('/sheet/:sheetId', authenticateToken, async (req, res) => {
  try {
    const sheetId = parseInt(req.params.sheetId);
    const attachments = await getAttachmentsBySheetId(sheetId);
    
    // Add public URLs if available
    const attachmentsWithUrls = attachments.map(attachment => ({
      ...attachment,
      public_url: sftpManager.getPublicUrl(attachment.sftp_path)
    }));
    
    res.json(attachmentsWithUrls);
  } catch (error) {
    console.error('Get attachments error:', error);
    res.status(500).json({ message: 'Failed to get attachments' });
  }
});

// GET /api/attachments/download/:attachmentId
router.get('/download/:attachmentId', authenticateToken, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await getAttachmentById(attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Download file from SFTP
    const fileBuffer = await sftpManager.downloadFile(attachment.sftp_path);

    // Set appropriate headers
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_name}"`);
    res.setHeader('Content-Length', attachment.file_size);

    // Send file
    res.send(fileBuffer);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
});

// GET /api/attachments/view/:attachmentId (for viewing in browser)
router.get('/view/:attachmentId', authenticateToken, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await getAttachmentById(attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Download file from SFTP
    const fileBuffer = await sftpManager.downloadFile(attachment.sftp_path);

    // Set headers for inline viewing
    res.setHeader('Content-Type', attachment.mime_type);
    res.setHeader('Content-Disposition', `inline; filename="${attachment.original_name}"`);
    res.setHeader('Content-Length', attachment.file_size);

    // Send file
    res.send(fileBuffer);
  } catch (error) {
    console.error('View error:', error);
    res.status(500).json({ message: 'Failed to view file' });
  }
});

// DELETE /api/attachments/:attachmentId
router.delete('/:attachmentId', authenticateToken, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.attachmentId);
    const attachment = await getAttachmentById(attachmentId);

    if (!attachment) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    // Delete file from SFTP
    await sftpManager.deleteFile(attachment.sftp_path);

    // Delete from database
    await deleteAttachment(attachmentId);

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({ message: 'Failed to delete attachment' });
  }
});

module.exports = router;