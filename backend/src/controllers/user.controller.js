import * as userService from '../services/user.service.js';

export async function getUsers(req, res, next) {
  try {
    const result = await userService.listUsers(req.user, req.query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.user, req.body, req.requestId);
    res.status(201).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    await userService.updateUser(req.user, req.params.id, req.body, req.requestId);
    res.json({ success: true, message: 'User updated successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.user, req.params.id, req.requestId);
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

export async function getAssignedStall(req, res, next) {
  try {
    const stall = await userService.getAssignedStall(req.user);
    res.json({ success: true, data: stall });
  } catch (error) {
    next(error);
  }
}
