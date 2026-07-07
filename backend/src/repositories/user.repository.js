import { User, Stall } from '../models/index.js';

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
    owner_id: user.owner_id,
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
 * Find a user by ID including their PIN (for auth).
 */
export async function findUserWithPinById(id) {
  return User.findByPk(id, {
    attributes: ['id', 'username', 'role', 'pin', 'owner_id', 'is_active'],
  });
}

/**
 * Insert a new user. Role-specific credentials must already be hashed or null.
 */
export async function insertUser({ username, password_hash, pin_hash, role, owner_id = null }) {
  const user = await User.create({
    username,
    password: password_hash,
    pin: pin_hash,
    role,
    owner_id,
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
 * Fetch all users belonging to a specific owner.
 */
export async function findAllUsersByOwnerId(ownerId) {
  return User.findAll({
    where: { owner_id: ownerId },
    attributes: { exclude: ['password', 'pin'] },
    order: [['created_at', 'DESC']],
  });
}

/**
 * Update user by ID.
 */
export async function updateUserById(id, data) {
  const updateData = { ...data };
  if (Object.prototype.hasOwnProperty.call(data, 'password_hash')) {
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

/**
 * Find the stall assigned to a user.
 */
export async function findAssignedStallByUserId(userId) {
  const user = await User.findByPk(userId, {
    include: [{ model: Stall }],
  });
  if (user && user.Stalls && user.Stalls.length > 0) {
    return user.Stalls[0];
  }
  return null;
}

/**
 * Find all active cashiers assigned to a specific stall.
 */
export async function findCashiersByStallId(stallId) {
  return User.findAll({
    attributes: ['id', 'username', 'role'],
    include: [{
      model: Stall,
      where: { id: stallId },
      attributes: [],
      through: { attributes: [] }
    }],
    where: { role: 'cashier', is_active: true }
  });
}

