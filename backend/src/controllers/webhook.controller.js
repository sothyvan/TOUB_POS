import * as paymentService from '../services/payment.service.js';

export async function handlePaymentWebhook(req, res) {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ success: false, message: 'Missing orderId or amount' });
    }

    // Call service to process payment logic
    await paymentService.processConfirmation(orderId, amount);

    // Immediate 200 OK for the banking provider
    res.status(200).json({ success: true, message: 'Webhook received' });
  } catch (error) {
    // We still return 200 to prevent bank from retrying if it's our internal error, 
    // or you could return 400 depending on the provider specs.
    res.status(400).json({ success: false, message: error.message });
  }
}
