import bcrypt from "bcryptjs";
import * as userRepository from "../repositories/user.repository.js";

export async function createAdmin(req, res ,next) {
  try {
    let { username, password, role } = req.body;

    username = String(username || "").trim();
    role = String(role || "").trim();
    const password_hash = await bcrypt.hash(String(password).trim(), 10);

    const adminId = await userRepository.insertUser({
      username: username,
      password_hash: password_hash,
      pin_hash: null,
      role: role,
    });
    res.status(201).json({ success: true, data: {id: adminId, username: username, role: role}});
  } catch (err) {
    next(err);
  }
}
