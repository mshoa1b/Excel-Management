// This is a one-time setup script to run after deployment
// You can run this locally pointing to your production database
// or create an API endpoint to initialize the database

const pool = require('./lib/db');
const bcrypt = require('bcryptjs');

const initializeDatabase = async () => {
  try {
    console.log('Initializing production database...');

    // Check if roles already exist
    const rolesCheck = await pool.query('SELECT COUNT(*) FROM roles');
    if (parseInt(rolesCheck.rows[0].count) > 0) {
      console.log('Database already initialized');
      return;
    }

    // Run the same seed logic as seed.js but for production
    const rolesData = [
      { name: 'SuperAdmin', permissions: ['manage_business','manage_users','manage_sheets','view_stats'] },
      { name: 'BusinessAdmin', permissions: ['manage_sheets','view_stats'] },
      { name: 'User', permissions: ['view_sheets','view_stats'] }
    ];

    for (const role of rolesData) {
      await pool.query(
        `INSERT INTO roles (name, permissions) VALUES ($1, $2)`,
        [role.name, role.permissions]
      );
    }

    // Create default SuperAdmin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await pool.query(
      `INSERT INTO users (username, password_hash, role_id) 
       VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'SuperAdmin'))`,
      ['admin', hashedPassword]
    );

    console.log('Database initialized successfully');
    console.log('Default login: admin / admin123');

  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    process.exit();
  }
};

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;