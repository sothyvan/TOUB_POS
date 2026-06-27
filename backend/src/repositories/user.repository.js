import { User } from '../models/index.js';

/**
 * Find a user by username. Returns user object with password mapped to password_hash.
 */
export async function findUserByUsername(username) {
  const user = await User.findOne({ where: { username } });
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    username: user.username,
    password_hash: user.password,
    role: user.role,
    is_active: user.is_active,
  };
}

/**
 * Find a user by ID.
 */
export async function findUserById(id) {
  return User.findByPk(id, {
    attributes: { exclude: ['password', 'pin'] },
  });
}

/**
 * Insert a new user. password must already be hashed.
 */
export async function insertUser({ username, password_hash, pin, role }) {
  const user = await User.create({
    username,
    password: password_hash,
    pin,
    role,
  });
  return user.id;
}

/**
 * Fetch all users (excluding sensitive credentials).
 */
export async function findAllUsers() {
  return User.findAll({
    attributes: { exclude: ['password', 'pin'] },
    order: [['created_at', 'DESC']],
  });
}

/**
 * Update user by ID.
 */
export async function updateUserById(id, data) {
  const updateData = { ...data };
  if (data.password_hash) {
    updateData.password = data.password_hash;
    delete updateData.password_hash;
  }
  const [affectedRows] = await User.update(updateData, { where: { id } });
  return affectedRows > 0;
}

/**
 * Delete user by ID.
 */
export async function deleteUserById(id) {
  const affectedRows = await User.destroy({ where: { id } });
  return affectedRows > 0;
}
