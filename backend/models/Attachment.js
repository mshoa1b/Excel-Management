const pool = require('../lib/db');

const createAttachment = async ({ 
  sheet_id, 
  business_id, 
  filename, 
  original_name, 
  file_size, 
  mime_type, 
  sftp_path, 
  uploaded_by 
}) => {
  const result = await pool.query(
    `INSERT INTO attachments 
     (sheet_id, business_id, filename, original_name, file_size, mime_type, sftp_path, uploaded_by) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
     RETURNING *`,
    [sheet_id, business_id, filename, original_name, file_size, mime_type, sftp_path, uploaded_by]
  );
  return result.rows[0];
};

const getAttachmentsBySheetId = async (sheetId) => {
  const result = await pool.query(
    `SELECT a.*, u.username as uploaded_by_name 
     FROM attachments a 
     LEFT JOIN users u ON a.uploaded_by = u.id 
     WHERE a.sheet_id = $1 
     ORDER BY a.created_at DESC`,
    [sheetId]
  );
  return result.rows;
};

const getAttachmentById = async (id) => {
  const result = await pool.query('SELECT * FROM attachments WHERE id = $1', [id]);
  return result.rows[0];
};

const deleteAttachment = async (id) => {
  const result = await pool.query('DELETE FROM attachments WHERE id = $1 RETURNING *', [id]);
  return result.rows[0];
};

const getAttachmentCountBySheetId = async (sheetId) => {
  const result = await pool.query('SELECT COUNT(*) as count FROM attachments WHERE sheet_id = $1', [sheetId]);
  return parseInt(result.rows[0].count);
};

module.exports = {
  createAttachment,
  getAttachmentsBySheetId,
  getAttachmentById,
  deleteAttachment,
  getAttachmentCountBySheetId
};