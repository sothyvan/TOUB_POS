import pool from '../config/db.js';

/**
 * Find a user by username. Returns the full row (including password_hash) or null.
 */
export async function findUserByUsername(username) {
  const [rows] = await pool.execute(
    'SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
}

/**
 * Insert a new user. password_hash must already be bcrypt-hashed.
 */
export async function insertUser({ username, password_hash, role }) {
  const [result] = await pool.execute(
    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
    [username, password_hash, role]
  );
  return result.insertId;
}

/**
 * Fetch all users (public fields only — no password_hash).
 */
export async function findAllUsers() {
  const [rows] = await pool.execute('SELECT id, username, role, created_at FROM users');
  return rows;
}
