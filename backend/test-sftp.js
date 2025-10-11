// Test SFTP connection
const sftpManager = require('./lib/sftp');

async function testConnection() {
  try {
    await sftpManager.connect();
    console.log('✅ SFTP connection successful!');
    
    // Test directory creation
    await sftpManager.ensureDirectory('/uploads/attachments/test');
    console.log('✅ Directory creation successful!');
    
    await sftpManager.disconnect();
    console.log('✅ SFTP disconnection successful!');
  } catch (error) {
    console.error('❌ SFTP connection failed:', error.message);
  }
}

testConnection();