const Client = require('ssh2-sftp-client');
const path = require('path');

class SFTPManager {
  constructor() {
    this.sftp = new Client();
    this.config = {
      host: process.env.IONOS_SFTP_HOST,
      port: process.env.IONOS_SFTP_PORT || 22,
      username: process.env.IONOS_SFTP_USERNAME,
      password: process.env.IONOS_SFTP_PASSWORD,
    };
    this.basePath = process.env.IONOS_SFTP_BASE_PATH || '/uploads/attachments';
    this.isConnected = false;
  }

  async connect() {
    if (this.isConnected) return;
    try {
      await this.sftp.connect(this.config);
      this.isConnected = true;
      console.log('SFTP connected successfully');
    } catch (error) {
      console.error('SFTP connection failed:', error);
      throw new Error('Failed to connect to SFTP server');
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await this.sftp.end();
      this.isConnected = false;
    }
  }

  async ensureDirectory(dirPath) {
    try {
      const exists = await this.sftp.exists(dirPath);
      if (!exists) {
        await this.sftp.mkdir(dirPath, true);
      }
    } catch (error) {
      console.error('Error ensuring directory:', error);
      throw error;
    }
  }

  async uploadFile(buffer, businessId, sheetId, filename) {
    console.log('SFTP uploadFile called with:', { businessId, sheetId, filename, bufferSize: buffer.length });
    
    try {
      await this.connect();
      console.log('SFTP connection established');
      
      // Create directory structure: /uploads/attachments/business_123/sheet_456/
      const businessDir = path.join(this.basePath, `business_${businessId}`);
      const sheetDir = path.join(businessDir, `sheet_${sheetId}`);
      
      console.log('Creating directories:', { businessDir, sheetDir });
      await this.ensureDirectory(businessDir);
      await this.ensureDirectory(sheetDir);
      
      const filePath = path.join(sheetDir, filename);
      console.log('Final file path:', filePath);
      
      // Upload file
      console.log('Starting SFTP put operation...');
      await this.sftp.put(buffer, filePath);
      
      console.log(`File uploaded successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('SFTP upload error details:', {
        message: error.message,
        code: error.code,
        level: error.level,
        stack: error.stack
      });
      throw new Error(`Failed to upload file to SFTP server: ${error.message}`);
    }
  }

  async downloadFile(sftpPath) {
    await this.connect();
    
    try {
      const buffer = await this.sftp.get(sftpPath);
      return buffer;
    } catch (error) {
      console.error('SFTP download error:', error);
      throw new Error('Failed to download file from SFTP server');
    }
  }

  async deleteFile(sftpPath) {
    await this.connect();
    
    try {
      const exists = await this.sftp.exists(sftpPath);
      if (exists) {
        await this.sftp.delete(sftpPath);
        console.log(`File deleted: ${sftpPath}`);
      }
    } catch (error) {
      console.error('SFTP delete error:', error);
      throw new Error('Failed to delete file from SFTP server');
    }
  }

  async listFiles(dirPath) {
    await this.connect();
    
    try {
      const exists = await this.sftp.exists(dirPath);
      if (!exists) return [];
      
      const list = await this.sftp.list(dirPath);
      return list.filter(item => item.type === '-'); // Only files, not directories
    } catch (error) {
      console.error('SFTP list error:', error);
      return [];
    }
  }

  // Generate public URL (if IONOS provides HTTP access to SFTP files)
  getPublicUrl(sftpPath) {
    const httpBaseUrl = process.env.IONOS_HTTP_BASE_URL;
    if (!httpBaseUrl) return null;
    
    // Remove the base path and create HTTP URL
    const relativePath = sftpPath.replace(this.basePath, '');
    return `${httpBaseUrl}${relativePath}`;
  }
}

// Create singleton instance
const sftpManager = new SFTPManager();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Disconnecting SFTP...');
  await sftpManager.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Disconnecting SFTP...');
  await sftpManager.disconnect();
  process.exit(0);
});

module.exports = sftpManager;