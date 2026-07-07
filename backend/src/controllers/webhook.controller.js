export function handlePaymentWebhook(_req, res) {
  res.status(501).json({
    success: false,
    message: 'Use POST /api/orders/:id/check-khqr-status for KHQR payment status checking.',
  });
}
