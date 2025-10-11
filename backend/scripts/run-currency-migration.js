// scripts/run-currency-migration.js
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

async function runCurrencyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Starting currency migration...');

    // Check if columns already exist
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'businesses' 
      AND column_name IN ('currency_code', 'currency_symbol');
    `);

    if (checkColumns.rows.length > 0) {
      console.log('✅ Currency columns already exist. Skipping migration.');
      return;
    }

    // Add currency columns
    await pool.query(`
      ALTER TABLE businesses 
      ADD COLUMN currency_code VARCHAR(3) DEFAULT 'USD',
      ADD COLUMN currency_symbol VARCHAR(5) DEFAULT '$';
    `);
    
    console.log('✅ Added currency columns to businesses table');

    // Update existing businesses with USD as default
    const updateResult = await pool.query(`
      UPDATE businesses SET 
        currency_code = 'USD',
        currency_symbol = '$'
      WHERE currency_code IS NULL OR currency_symbol IS NULL;
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} businesses with default USD currency`);

    // Verify the migration
    const verification = await pool.query(`
      SELECT id, name, currency_code, currency_symbol 
      FROM businesses 
      LIMIT 5;
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Sample businesses with currency settings:');
    console.table(verification.rows);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runCurrencyMigration()
    .then(() => {
      console.log('🎉 Currency migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { runCurrencyMigration };