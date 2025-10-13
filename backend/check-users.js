const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkUsers() {
  try {
    // Check users
    const users = await pool.query('SELECT id, username, role_id, business_id FROM users LIMIT 5;');
    console.log('Users in database:', users.rows);
    
    // Check businesses  
    const businesses = await pool.query('SELECT id, name, owner_id FROM businesses LIMIT 5;');
    console.log('Businesses in database:', businesses.rows);
    
    // Check roles
    const roles = await pool.query('SELECT * FROM roles;');
    console.log('Roles in database:', roles.rows);
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsers();