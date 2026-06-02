import { loginUser } from '../services/auth.service.js';

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
