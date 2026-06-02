// TODO (Unit 1): Implement order controller
// - createOrder: validate body, call orderService.create(req.user.id, body)
// - getMyOrders: call orderService.getByUser(req.user.id)

export async function createOrder(_req, res) {
  res.status(501).json({ success: false, message: 'Not implemented yet.' });
}

export async function getMyOrders(_req, res) {
  res.status(501).json({ success: false, message: 'Not implemented yet.' });
}
