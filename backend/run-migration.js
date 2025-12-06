const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://neondb_owner:npg_xjLTPW7FDQl8@ep-young-sound-abq3530d-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const client = new Client({
  connectionString,
});

async function runMigration() {
  try {
    await client.connect();
    console.log('Connected to database.');

    const sqlPath = path.join(__dirname, 'migrations_notifications_history.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

runMigration();
