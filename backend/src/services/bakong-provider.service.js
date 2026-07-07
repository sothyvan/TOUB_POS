const CHECK_MODE_LABEL = 'bakong';
const REQUEST_TIMEOUT_MS = 10000;

function httpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function getByPath(object, path) {
  return path.split('.').reduce((current, key) => current?.[key], object);
}

function pickFirst(object, paths) {
  for (const path of paths) {
    const value = getByPath(object, path);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function readStatusText(payload) {
  return normalizeText(pickFirst(payload, [
    'status.message',
    'status.status',
    'status',
    'message',
    'responseMessage',
    'response_description',
    'error',
    'errorMessage',
  ])).toLowerCase();
}

function readResponseMessage(payload) {
  return normalizeText(pickFirst(payload, [
    'responseMessage',
    'response_message',
    'status.message',
    'message',
    'errorMessage',
    'error',
  ])) || null;
}

function readResponseCode(payload) {
  return normalizeText(pickFirst(payload, [
    'responseCode',
    'response_code',
    'status.code',
    'code',
    'errorCode',
  ])).toLowerCase();
}

function normalizeAmount(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const amount = Number(value);
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : null;
}

function normalizeCurrency(value) {
  const currency = normalizeText(value).toUpperCase();
  return currency || null;
}

function readTransactionData(payload) {
  return payload?.data
    ?? payload?.transaction
    ?? payload?.result
    ?? payload?.payment
    ?? {};
}

function isSuccessCode(code) {
  return ['0', '00', 'success', 'successful', 'paid', 'completed'].includes(code);
}

function isNotFoundResponse(code, text, httpStatus) {
  return httpStatus === 404
    || ['404', 'not_found', 'transaction_not_found'].includes(code)
    || text.includes('not found')
    || text.includes('not exist')
    || text.includes('could not be found');
}

function isFailedResponse(code, text) {
  return ['failed', 'fail', 'rejected', 'cancelled', 'canceled'].includes(code)
    || text.includes('failed')
    || text.includes('rejected')
    || text.includes('cancelled')
    || text.includes('canceled');
}

function normalizeBakongResponse(payload, httpStatus = 200) {
  const responseCode = readResponseCode(payload);
  const responseMessage = readResponseMessage(payload);
  const statusText = readStatusText(payload);
  const transactionData = readTransactionData(payload);
  const amount = normalizeAmount(pickFirst(transactionData, [
    'amount',
    'totalAmount',
    'transactionAmount',
    'paymentAmount',
  ]));
  const currency = normalizeCurrency(pickFirst(transactionData, [
    'currency',
    'currencyCode',
    'transactionCurrency',
  ]));
  const hash = normalizeText(pickFirst(transactionData, [
    'hash',
    'md5',
    'transactionHash',
  ])) || null;
  const destinationAccount = normalizeText(pickFirst(transactionData, [
    'toAccountId',
    'receiverAccountId',
    'destinationAccountId',
    'merchantAccountId',
    'accountId',
  ])) || null;

  if (isNotFoundResponse(responseCode, statusText, httpStatus)) {
    return {
      status: 'not_found',
      httpStatus,
      responseCode: responseCode || null,
      responseMessage,
      amount,
      currency,
      hash,
      destinationAccount,
      rawResponse: payload,
    };
  }

  if (isSuccessCode(responseCode) || statusText === 'success' || statusText === 'paid') {
    return {
      status: 'paid',
      httpStatus,
      responseCode: responseCode || null,
      responseMessage,
      amount,
      currency,
      hash,
      destinationAccount,
      rawResponse: payload,
    };
  }

  if (isFailedResponse(responseCode, statusText)) {
    return {
      status: 'failed',
      httpStatus,
      responseCode: responseCode || null,
      responseMessage,
      amount,
      currency,
      hash,
      destinationAccount,
      rawResponse: payload,
    };
  }

  return {
    status: httpStatus >= 400 ? 'error' : 'failed',
    httpStatus,
    responseCode: responseCode || null,
    responseMessage,
    amount,
    currency,
    hash,
    destinationAccount,
    rawResponse: payload,
  };
}

function getOpenApiConfig() {
  const baseUrl = normalizeText(process.env.BAKONG_OPEN_API_BASE_URL);
  const token = normalizeText(process.env.BAKONG_OPEN_API_TOKEN);

  if (!baseUrl) {
    throw httpError('BAKONG_OPEN_API_BASE_URL is required for Bakong status checking.', 503);
  }

  if (!token) {
    throw httpError('BAKONG_OPEN_API_TOKEN is required for Bakong status checking.', 503);
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ''),
    token,
  };
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function postBakongCheck(config, md5) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${config.baseUrl}/v1/check_transaction_by_md5`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ md5 }),
      signal: controller.signal,
    });
    const payload = await parseJsonSafely(response);

    return normalizeBakongResponse(payload, response.status);
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getBakongCheckMode() {
  return CHECK_MODE_LABEL;
}

export async function checkBakongTransactionByMd5(md5) {
  const normalizedMd5 = normalizeText(md5).toLowerCase();
  if (!normalizedMd5) {
    throw httpError('KHQR md5 is required before checking Bakong payment status.', 400);
  }

  const config = getOpenApiConfig();
  try {
    return await postBakongCheck(config, normalizedMd5);
  } catch (error) {
    if (error.status) {
      throw error;
    }

    return {
      status: 'error',
      httpStatus: null,
      responseCode: null,
      responseMessage: error.name === 'AbortError'
        ? 'Bakong check request timed out.'
        : 'Bakong check request failed.',
      amount: null,
      currency: null,
      hash: normalizedMd5,
      destinationAccount: null,
      rawResponse: null,
      errorMessage: error.name === 'AbortError'
        ? 'Bakong check request timed out.'
        : 'Bakong check request failed.',
    };
  }
}
