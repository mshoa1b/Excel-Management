const fs = require('fs');
const path = require('path');
const pool = require('../lib/db');

const resetTable = async () => {
  try {
    console.log('Dropping sheets_history table...');
    await pool.query('DROP TABLE IF EXISTS sheets_history CASCADE');
    
    // Read the migration file again
    const sqlPath = path.join(__dirname, '../migrations_notifications_history.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Re-running migration...');
    await pool.query(sql);
    console.log('Reset successful: sheets_history table recreated.');
  } catch (err) {
    console.error('Reset failed:', err);
  } finally {
    pool.end();
  }
};

resetTable();
