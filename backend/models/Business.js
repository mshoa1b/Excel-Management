const pool = require('../lib/db');

const createBusiness = async ({ name, owner_id, currency_code = 'USD', currency_symbol = '$' }) => {
  const result = await pool.query(
    'INSERT INTO businesses (name, owner_id, currency_code, currency_symbol) VALUES ($1, $2, $3, $4) RETURNING *',
    [name, owner_id, currency_code, currency_symbol]
  );
  return result.rows[0];
};

const getBusinesses = async () => {
  const result = await pool.query('SELECT * FROM businesses');
  return result.rows;
};

const getBusinessById = async (id) => {
  const result = await pool.query('SELECT * FROM businesses WHERE id = $1', [id]);
  return result.rows[0];
};

const updateBusinessCurrency = async (id, { currency_code, currency_symbol }) => {
  const result = await pool.query(
    'UPDATE businesses SET currency_code = $1, currency_symbol = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
    [currency_code, currency_symbol, id]
  );
  return result.rows[0];
};

module.exports = { createBusiness, getBusinesses, getBusinessById, updateBusinessCurrency };
