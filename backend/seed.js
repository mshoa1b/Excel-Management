const pool = require('./lib/db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    console.log('Seeding database...');

    // -------------------------------
    // 1. Ensure roles exist
    // -------------------------------
    const rolesData = [
      { name: 'SuperAdmin', permissions: ['manage_business','manage_users','manage_sheets','view_stats'] },
      { name: 'BusinessAdmin', permissions: ['manage_sheets','view_stats'] },
      { name: 'User', permissions: ['view_sheets','view_stats'] }
    ];

    for (const role of rolesData) {
      await pool.query(
        `INSERT INTO roles (name, permissions)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [role.name, role.permissions]
      );
    }
    console.log('Roles ensured');

    // Fetch role IDs dynamically
    const rolesResult = await pool.query('SELECT * FROM roles');
    const roles = {};
    rolesResult.rows.forEach(r => { roles[r.name] = r.id; });

    // -------------------------------
    // 2. Ensure SuperAdmin exists
    // -------------------------------
    const superAdminExists = await pool.query('SELECT * FROM users WHERE username=$1', ['superadmin']);
    let superAdmin;
    if (superAdminExists.rows.length === 0) {
      const hash = bcrypt.hashSync('SuperAdmin123', 10);
      const result = await pool.query(
        'INSERT INTO users (username, password_hash, role_id) VALUES ($1,$2,$3) RETURNING *',
        ['superadmin', hash, roles['SuperAdmin']]
      );
      superAdmin = result.rows[0];
      console.log('SuperAdmin created: superadmin / Password: SuperAdmin123');
    } else {
      superAdmin = superAdminExists.rows[0];
      console.log('SuperAdmin already exists:', superAdmin.username);
    }

    // -------------------------------
    // 3. Ensure Sample Business exists
    // -------------------------------
    const businessExists = await pool.query('SELECT * FROM businesses WHERE name=$1', ['Demo Business']);
    let business;
    if (businessExists.rows.length === 0) {
      const result = await pool.query(
        'INSERT INTO businesses (name, owner_id) VALUES ($1,$2) RETURNING *',
        ['Demo Business', superAdmin.id]
      );
      business = result.rows[0];
      console.log('Sample business created:', business.name);
    } else {
      business = businessExists.rows[0];
      console.log('Sample business already exists:', business.name);
    }

    // -------------------------------
    // 4. Ensure Business Admin exists
    // -------------------------------
    const adminExists = await pool.query('SELECT * FROM users WHERE username=$1', ['admin1']);
    if (adminExists.rows.length === 0) {
      const hash = bcrypt.hashSync('Admin123', 10);
      await pool.query(
        'INSERT INTO users (username, password_hash, role_id, business_id) VALUES ($1,$2,$3,$4)',
        ['admin1', hash, roles['BusinessAdmin'], business.id]
      );
      console.log('Business Admin created: admin1 / Password: Admin123');
    } else {
      console.log('Business Admin already exists:', adminExists.rows[0].username);
    }

    // -------------------------------
    // 5. Ensure Sample Sheet exists
    // -------------------------------
    const sheetExists = await pool.query(
      'SELECT * FROM sheets WHERE order_no=$1 AND business_id=$2',
      ['ORD123456', business.id]
    );

    if (sheetExists.rows.length === 0) {
      // Compute platform and return_within_30_days
      const date_received = '2025-08-27';
      const order_date = '2025-08-01';
      const order_no = '12345678';
      const platform = /^\d{8}$/.test(order_no) ? 'Back Market' : 'Amazon';
      const diffDays = Math.floor((new Date(date_received) - new Date(order_date)) / (1000*60*60*24));
      const return_within_30_days = diffDays <= 30 ? 'Yes' : 'No';

      await pool.query(
        `INSERT INTO sheets
        (business_id, date_received, order_no, order_date, customer_name, imei, sku, customer_comment, multiple_return, apple_google_id, return_type, replacement_available, done_by, blocked_by, cs_comment, resolution, refund_amount, return_tracking_no, platform, return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes)
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)`,
        [
          business.id,
          date_received,
          order_no,
          order_date,
          'John Doe',
          '357504147972616',
          'iPhone 14 128GB Purple',
          'Customer changed mind',
          'No',
          'Yes',
          'REFUND',
          'Yes',
          'Shah',
          'PIN required',
          'Handled by CS',
          'Back in stock',
          450.0,
          'RT123456',
          platform,
          return_within_30_days,
          'Battery',
          'No',
          'Additional notes here',
          'Pending',
          'Manager note here'
        ]
      );
      console.log('Sample sheet created');
    } else {
      console.log('Sample sheet already exists');
    }

    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
};

seed();
