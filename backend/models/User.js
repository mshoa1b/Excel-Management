const pool = require('../lib/db');
const bcrypt = require('bcryptjs');

const createUser = async ({ username, password, role_id, business_id }) => {
  const hash = bcrypt.hashSync(password, 10);
  const result = await pool.query(
    'INSERT INTO users (username, password_hash, role_id, business_id) VALUES ($1,$2,$3,$4) RETURNING *',
    [username, hash, role_id, business_id]
  );
  return result.rows[0];
};

const getUserByUsername = async (username) => {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
  return result.rows[0];
};

module.exports = { createUser, getUserByUsername };
