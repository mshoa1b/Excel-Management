const pool = require('../lib/db');

const createBusiness = async ({ name, owner_id }) => {
  const result = await pool.query(
    'INSERT INTO businesses (name, owner_id) VALUES ($1,$2) RETURNING *',
    [name, owner_id]
  );
  return result.rows[0];
};

const getBusinesses = async () => {
  const result = await pool.query('SELECT * FROM businesses');
  return result.rows;
};

module.exports = { createBusiness, getBusinesses };
