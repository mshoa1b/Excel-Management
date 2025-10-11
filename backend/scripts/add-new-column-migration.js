// scripts/add-new-column-migration.js
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config();

async function addNewColumnMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Starting new column migration...');

    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'your_table_name' 
      AND column_name = 'your_new_column';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Column already exists. Skipping migration.');
      return;
    }

    // Add the new column
    await pool.query(`
      ALTER TABLE your_table_name 
      ADD COLUMN your_new_column VARCHAR(255) DEFAULT 'default_value';
    `);
    
    console.log('✅ Added new column to table');

    // Optional: Update existing rows if needed
    // await pool.query(`
    //   UPDATE your_table_name 
    //   SET your_new_column = 'some_value' 
    //   WHERE some_condition;
    // `);

    // Verify the migration
    const verification = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'your_table_name' 
      AND column_name = 'your_new_column';
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 New column details:');
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
  addNewColumnMigration()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addNewColumnMigration };