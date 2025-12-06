const fs = require('fs');
const path = require('path');
const pool = require('../lib/db');

const runMigration = async () => {
  try {
    const sqlPath = path.join(__dirname, '../migrations_notifications_history.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration...');
    await pool.query(sql);
    console.log('Migration successful: tables created/verified.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
};

runMigration();
