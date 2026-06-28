import { loginUser, loginWithPin } from '../services/auth.service.js';
import { findAllUsers } from '../repositories/user.repository.js';

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'username and password are required.' });
    }
    const data = await loginUser(username, password);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function loginPin(req, res, next) {
  try {
    const { userId, pin } = req.body;
    if (!userId || !pin) {
      return res.status(400).json({ success: false, message: 'userId and pin are required.' });
    }
    const data = await loginWithPin(userId, pin);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getPublicCashiers(req, res, next) {
  try {
    const users = await findAllUsers();
    const cashiers = users
      .filter((u) => u.role === 'cashier' && u.is_active !== false)
      .map((u) => ({ id: u.id, username: u.username, role: u.role }));
    res.json({ success: true, data: cashiers });
  } catch (err) {
    next(err);
  }
}
