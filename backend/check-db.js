const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkTables() {
  try {
    console.log('Checking database connection...');
    
    // Check if enquiries table exists
    const enquiriesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'enquiries'
      );
    `);
    
    console.log('Enquiries table exists:', enquiriesCheck.rows[0].exists);
    
    // Check if enquiry_messages table exists
    const messagesCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'enquiry_messages'
      );
    `);
    
    console.log('Enquiry_messages table exists:', messagesCheck.rows[0].exists);
    
    // If tables don't exist, create them
    if (!enquiriesCheck.rows[0].exists || !messagesCheck.rows[0].exists) {
      console.log('Creating missing enquiries tables...');
      
      const createEnquiries = `
        CREATE TABLE IF NOT EXISTS enquiries (
          id SERIAL PRIMARY KEY,
          status VARCHAR(50) NOT NULL DEFAULT 'Awaiting Business',
          enquiry_date DATE NOT NULL DEFAULT CURRENT_DATE,
          order_number VARCHAR(255),
          platform VARCHAR(50),
          description TEXT CHECK (char_length(description) <= 2000),
          business_id INT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
          created_by INT NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      const createMessages = `
        CREATE TABLE IF NOT EXISTS enquiry_messages (
          id SERIAL PRIMARY KEY,
          enquiry_id INT NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
          message TEXT NOT NULL,
          attachments JSON,
          created_by INT NOT NULL REFERENCES users(id),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;
      
      const createIndexes = `
        CREATE INDEX IF NOT EXISTS idx_enquiries_business_id ON enquiries(business_id);
        CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
        CREATE INDEX IF NOT EXISTS idx_enquiry_messages_enquiry_id ON enquiry_messages(enquiry_id);
      `;
      
      await pool.query(createEnquiries);
      console.log('Created enquiries table');
      
      await pool.query(createMessages);
      console.log('Created enquiry_messages table');
      
      await pool.query(createIndexes);
      console.log('Created indexes');
    }
    
    // Test a simple query
    const testQuery = await pool.query('SELECT COUNT(*) FROM enquiries;');
    console.log('Enquiries count:', testQuery.rows[0].count);
    
    console.log('Database check complete!');
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();