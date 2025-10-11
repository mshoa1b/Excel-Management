// scripts/add-priority-column.js
const { Pool } = require('pg');

require('dotenv').config();

async function addPriorityColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🚀 Adding priority column to sheets table...');

    // Check if column already exists
    const checkColumn = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sheets' 
      AND column_name = 'priority';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('✅ Priority column already exists. Skipping migration.');
      return;
    }

    // Add priority column with constraint
    await pool.query(`
      ALTER TABLE sheets 
      ADD COLUMN priority VARCHAR(20) 
      CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent'))
      DEFAULT 'Normal';
    `);
    
    console.log('✅ Added priority column to sheets table');

    // Create index for faster queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sheets_priority ON sheets(priority);
    `);
    
    console.log('✅ Created index on priority column');

    // Verify the migration
    const verification = await pool.query(`
      SELECT column_name, data_type, column_default, check_clause
      FROM information_schema.columns 
      LEFT JOIN information_schema.check_constraints 
      ON column_name = 'priority'
      WHERE table_name = 'sheets' 
      AND column_name = 'priority';
    `);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Priority column details:');
    console.table(verification.rows);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  addPriorityColumn()
    .then(() => {
      console.log('🎉 Priority column added successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { addPriorityColumn };