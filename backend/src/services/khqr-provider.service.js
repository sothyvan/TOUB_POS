import khqrSdk from 'bakong-khqr';

const { BakongKHQR, IndividualInfo, khqrData } = khqrSdk;

const DEFAULT_MERCHANT_NAME = 'Toub POS';
const DEFAULT_MERCHANT_CITY = 'PHNOM PENH';
const DEFAULT_EXPIRATION_MINUTES = 10;
const DEFAULT_MERCHANT_CATEGORY_CODE = '5999';

function configurationError(message) {
  const error = new Error(message);
  error.status = 503;
  return error;
}

function getExpirationMinutes() {
  const configured = Number(process.env.KHQR_EXPIRATION_MINUTES || DEFAULT_EXPIRATION_MINUTES);
  if (!Number.isFinite(configured) || configured <= 0) {
    return DEFAULT_EXPIRATION_MINUTES;
  }
  return configured;
}

function normalizeKhqrLabel(value, fallback, maxLength = 25) {
  const normalized = String(value || fallback || '').trim();
  return normalized.slice(0, maxLength);
}

function getRequiredBakongAccountId() {
  const accountId = String(process.env.BAKONG_ACCOUNT_ID || '').trim();
  if (!accountId) {
    throw configurationError('BAKONG_ACCOUNT_ID is required for KHQR generation.');
  }
  return accountId;
}

function createReference(orderId) {
  const timestamp = Date.now().toString(36).toUpperCase();
  return `TOUB-${orderId}-${timestamp}`;
}

function buildPaymentContext({ order, stall, cashier }) {
  const paymentReference = createReference(order.id);
  const expiresAt = new Date(Date.now() + getExpirationMinutes() * 60 * 1000);

  return {
    amount: Number(order.total_usd).toFixed(2),
    paymentReference,
    expiresAt,
    accountId: getRequiredBakongAccountId(),
    merchantName: normalizeKhqrLabel(process.env.KHQR_MERCHANT_NAME, DEFAULT_MERCHANT_NAME),
    merchantCity: normalizeKhqrLabel(process.env.KHQR_MERCHANT_CITY, DEFAULT_MERCHANT_CITY, 15),
    storeLabel: normalizeKhqrLabel(stall?.name, `Stall ${order.stall_id}`),
    terminalLabel: normalizeKhqrLabel(cashier?.username, `Cashier ${order.cashier_id}`),
  };
}

function generateSdkPayload(context) {
  const optionalData = {
    currency: khqrData.currency.usd,
    amount: Number(context.amount),
    billNumber: context.paymentReference,
    storeLabel: context.storeLabel,
    terminalLabel: context.terminalLabel,
    expirationTimestamp: context.expiresAt.getTime(),
    merchantCategoryCode: DEFAULT_MERCHANT_CATEGORY_CODE,
  };

  const individualInfo = new IndividualInfo(
    context.accountId,
    context.merchantName,
    context.merchantCity,
    optionalData
  );

  const response = new BakongKHQR().generateIndividual(individualInfo);
  if (response?.status?.code !== 0 || !response?.data?.qr || !response?.data?.md5) {
    throw new Error(response?.status?.message || 'KHQR SDK failed to generate an Individual QR.');
  }

  return {
    providerMode: 'sdk',
    qrPayload: response.data.qr,
    qrMd5: response.data.md5,
  };
}

export function generateKhqrIndividualPayment(input) {
  const context = buildPaymentContext(input);
  const providerResult = generateSdkPayload(context);

  return {
    ...providerResult,
    paymentReference: context.paymentReference,
    expiresAt: context.expiresAt,
  };
}
