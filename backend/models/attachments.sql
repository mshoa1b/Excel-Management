-- Attachments table for storing file metadata
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  sheet_id INT NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
  business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  file_size INT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  sftp_path VARCHAR(500) NOT NULL, -- Path on SFTP server
  uploaded_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attachments_sheet_id ON attachments(sheet_id);
CREATE INDEX IF NOT EXISTS idx_attachments_business_id ON attachments(business_id);