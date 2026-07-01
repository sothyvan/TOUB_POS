export function handlePaymentWebhook(_req, res) {
  res.status(501).json({
    success: false,
    message: 'KHQR webhook confirmation is not implemented in Phase 4.',
  });
}
