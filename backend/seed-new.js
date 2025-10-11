const pool = require('./lib/db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    console.log('Seeding database...');

    // -------------------------------
    // 1. Roles are already created by new.sql schema
    // Just get their IDs
    // -------------------------------
    const rolesResult = await pool.query('SELECT * FROM roles');
    const roles = {};
    rolesResult.rows.forEach(r => { roles[r.name] = r.id; });
    console.log('Roles found:', Object.keys(roles));

    // -------------------------------
    // 2. Ensure SuperAdmin exists
    // -------------------------------
    const superAdminExists = await pool.query(
      'SELECT * FROM users WHERE role_id = $1',
      [roles.SuperAdmin]
    );

    if (superAdminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('SuperAdmin123', 10);
      const superAdmin = await pool.query(
        `INSERT INTO users (username, password_hash, role_id)
         VALUES ($1, $2, $3) RETURNING *`,
        ['superadmin', hashedPassword, roles.SuperAdmin]
      );
      console.log('SuperAdmin created: superadmin / Password: SuperAdmin123');
    } else {
      console.log('SuperAdmin already exists');
    }

    // -------------------------------
    // 3. Ensure Sample Business exists
    // -------------------------------
    const businessExists = await pool.query(
      'SELECT * FROM businesses WHERE name = $1',
      ['Demo Business']
    );

    let business;
    if (businessExists.rows.length === 0) {
      business = await pool.query(
        `INSERT INTO businesses (name) VALUES ($1) RETURNING *`,
        ['Demo Business']
      );
      business = business.rows[0];
      console.log('Sample business created: Demo Business');
    } else {
      business = businessExists.rows[0];
      console.log('Sample business already exists');
    }

    // -------------------------------
    // 4. Ensure Business Admin exists for the business
    // -------------------------------
    const adminExists = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      ['admin1']
    );

    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('Admin123', 10);
      await pool.query(
        `INSERT INTO users (username, password_hash, role_id, business_id)
         VALUES ($1, $2, $3, $4)`,
        ['admin1', hashedPassword, roles.BusinessAdmin, business.id]
      );
      console.log('Business Admin created: admin1 / Password: Admin123');
    } else {
      console.log('Business Admin already exists');
    }

    // -------------------------------
    // 5. Ensure Sample Sheet exists
    // -------------------------------
    const sheetExists = await pool.query(
      'SELECT * FROM sheets WHERE order_no = $1 AND business_id = $2',
      ['12345678', business.id]
    );

    if (sheetExists.rows.length === 0) {
      const date_received = '2025-08-27';
      const order_date = '2025-08-01';
      const order_no = '12345678';
      const platform = /^\d{8}$/.test(order_no) ? 'Back Market' : 'Amazon';
      const diffDays = Math.floor((new Date(date_received) - new Date(order_date)) / (1000*60*60*24));
      const return_within_30_days = diffDays <= 30 ? 'Yes' : 'No';
      const today = new Date().toISOString().slice(0,10);

      await pool.query(
        `INSERT INTO sheets
        (business_id, date_received, order_no, order_date, customer_name, imei, sku, customer_comment,
         multiple_return, apple_google_id, return_type, locked, oow_case, replacement_available, done_by,
         blocked_by, cs_comment, resolution, refund_amount, refund_date, return_tracking_no, platform,
         return_within_30_days, issue, out_of_warranty, additional_notes, status, manager_notes)
        VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)`,
        [
          business.id,
          date_received,
          order_no,
          order_date,
          'John Doe',
          '123456789012345',
          'iPhone 14 Pro',
          'Screen cracked, need replacement',
          'No',
          'Yes',
          'Refund',
          'No',
          'No',
          'Yes',
          'Alice',
          'PIN Required',
          'Handled by CS',
          'Back in stock',
          450.0,
          today,
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