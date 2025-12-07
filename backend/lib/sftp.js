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

  async resetConnection() {
    console.log('Resetting SFTP connection...');
    try {
      this.isConnected = false;
      if (this.sftp) {
        this.sftp.removeAllListeners();
        await this.sftp.end();
      }
    } catch (e) {
      console.error('Error ending SFTP connection:', e);
    }
    this.sftp = new Client();
  }

  async connect() {
    if (this.isConnected) return;
    try {
      // Add timeout and more detailed config
      const configWithTimeout = {
        ...this.config,
        readyTimeout: 10000,
        keepaliveInterval: 5000,
        debug: console.log
      };
      
      console.log('Attempting SFTP connection to:', this.config.host);
      console.log('Username:', this.config.username);
      
      await this.sftp.connect(configWithTimeout);
      this.isConnected = true;
      console.log('SFTP connected successfully');
    } catch (error) {
      console.error('SFTP connection failed:', error);
      console.error('Config used:', { 
        host: this.config.host, 
        port: this.config.port, 
        username: this.config.username,
        passwordLength: this.config.password?.length 
      });
      throw new Error(`Failed to connect to SFTP server: ${error.message}`);
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

  // Helper function to create SFTP-compatible paths (always forward slashes)
  sftpPath(...segments) {
    // Filter out empty or undefined segments
    const validSegments = segments.filter(segment => segment && typeof segment === 'string' && segment.trim() !== '');
    if (validSegments.length === 0) {
      throw new Error('No valid path segments provided');
    }
    const path = validSegments.join('/').replace(/\/+/g, '/');
    console.log('Generated SFTP path:', path, 'from segments:', segments);
    return path;
  }

  async uploadFile(buffer, businessId, sheetId, filename) {
    console.log('SFTP uploadFile called with:', { businessId, sheetId, filename, bufferSize: buffer?.length });
    
    // Validate input parameters
    if (!buffer) throw new Error('Buffer is required');
    if (!businessId) throw new Error('Business ID is required');
    if (!sheetId) throw new Error('Sheet ID is required');
    if (!filename) throw new Error('Filename is required');
    
    try {
      await this.connect();
      console.log('SFTP connection established');
      
      // Create directory structure: /uploads/attachments/business_123/sheet_456/
      console.log('Base path:', this.basePath);
      const businessDir = this.sftpPath(this.basePath, `business_${businessId}`);
      const sheetDir = this.sftpPath(businessDir, `sheet_${sheetId}`);
      
      console.log('Creating directories:', { 
        basePath: this.basePath,
        businessDir, 
        sheetDir,
        businessId,
        sheetId 
      });
      await this.ensureDirectory(businessDir);
      await this.ensureDirectory(sheetDir);
      
      const filePath = this.sftpPath(sheetDir, filename);
      console.log('Final file path:', filePath);
      
      // Upload file
      console.log('Starting SFTP put operation...');
      await this.sftp.put(buffer, filePath);
      
      console.log(`File uploaded successfully: ${filePath}`);
      return filePath;
    } catch (error) {
      console.error('SFTP upload error (first attempt):', error.message);
      
      try {
        console.log('Retrying SFTP upload with fresh connection...');
        await this.resetConnection();
        await this.connect();
        
        const businessDir = this.sftpPath(this.basePath, `business_${businessId}`);
        const sheetDir = this.sftpPath(businessDir, `sheet_${sheetId}`);
        
        await this.ensureDirectory(businessDir);
        await this.ensureDirectory(sheetDir);
        
        const filePath = this.sftpPath(sheetDir, filename);
        await this.sftp.put(buffer, filePath);
        
        console.log(`File uploaded successfully (retry): ${filePath}`);
        return filePath;
      } catch (retryError) {
        console.error('SFTP upload error (second attempt):', retryError);
        throw new Error(`Failed to upload file to SFTP server: ${retryError.message}`);
      }
    }
  }

  async downloadFile(sftpPath) {
    try {
      await this.connect();
      const buffer = await this.sftp.get(sftpPath);
      return buffer;
    } catch (error) {
      console.error('SFTP download error (first attempt):', error.message);
      
      try {
        console.log('Retrying SFTP download with fresh connection...');
        await this.resetConnection();
        await this.connect();
        const buffer = await this.sftp.get(sftpPath);
        return buffer;
      } catch (retryError) {
        console.error('SFTP download error (second attempt):', retryError);
        throw new Error('Failed to download file from SFTP server');
      }
    }
  }

  async deleteFile(sftpPath) {
    try {
      await this.connect();
      const exists = await this.sftp.exists(sftpPath);
      if (exists) {
        await this.sftp.delete(sftpPath);
        console.log(`File deleted: ${sftpPath}`);
      }
    } catch (error) {
      console.error('SFTP delete error (first attempt):', error.message);
      
      try {
        console.log('Retrying SFTP delete with fresh connection...');
        await this.resetConnection();
        await this.connect();
        const exists = await this.sftp.exists(sftpPath);
        if (exists) {
          await this.sftp.delete(sftpPath);
          console.log(`File deleted (retry): ${sftpPath}`);
        }
      } catch (retryError) {
        console.error('SFTP delete error (second attempt):', retryError);
        throw new Error('Failed to delete file from SFTP server');
      }
    }
  }

  async listFiles(dirPath) {
    try {
      await this.connect();
      const exists = await this.sftp.exists(dirPath);
      if (!exists) return [];
      
      const list = await this.sftp.list(dirPath);
      return list.filter(item => item.type === '-'); // Only files, not directories
    } catch (error) {
      console.error('SFTP list error (first attempt):', error.message);
      
      try {
        console.log('Retrying SFTP list with fresh connection...');
        await this.resetConnection();
        await this.connect();
        const exists = await this.sftp.exists(dirPath);
        if (!exists) return [];
        
        const list = await this.sftp.list(dirPath);
        return list.filter(item => item.type === '-');
      } catch (retryError) {
        console.error('SFTP list error (second attempt):', retryError);
        return [];
      }
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