export const CURRENT_FINANCIAL_POLICY = Object.freeze({
  serviceFeesEnabled: false,
  taxesEnabled: false,
  totalRule: 'item_subtotal_only',
  defaultPricingCurrency: 'usd',
});

export function convertUsdPriceToKhr(value, exchangeRateKhrPerUsd) {
  const usd = Number(value);
  const rate = Number(exchangeRateKhrPerUsd);
  if (!Number.isFinite(usd) || usd < 0 || !Number.isFinite(rate) || rate <= 0) {
    return '';
  }
  return String(Math.round(usd * rate));
}

export function convertKhrPriceToUsd(value, exchangeRateKhrPerUsd) {
  const khr = Number(value);
  const rate = Number(exchangeRateKhrPerUsd);
  if (!Number.isFinite(khr) || khr < 0 || !Number.isFinite(rate) || rate <= 0) {
    return '';
  }
  return (khr / rate).toFixed(2);
}

export function calculateCurrentDisplayTotal(subtotal) {
  const amount = Number(subtotal);
  return Number.isFinite(amount) ? amount : 0;
}

export function calculateMixedCashPreview({
  totalUsd,
  totalKhr,
  pricingCurrency,
  exchangeRateKhrPerUsd,
  cashReceivedUsd = 0,
  cashReceivedKhr = 0,
}) {
  const rate = Number(exchangeRateKhrPerUsd);
  const usdCents = Math.round(Number(cashReceivedUsd || 0) * 100);
  const receivedKhr = Math.round(Number(cashReceivedKhr || 0));
  const required = pricingCurrency === 'khr'
    ? Math.round(Number(totalKhr || 0)) * 100
    : Math.round(Number(totalUsd || 0) * 100) * rate;
  const received = (usdCents * rate) + (receivedKhr * 100);
  const difference = received - required;
  return {
    isValid: Number.isFinite(difference) && received > 0,
    isUnderpaid: Number.isFinite(difference) && received > 0 && difference < 0,
    changeUsd: difference > 0
      ? Math.floor((difference + (rate / 2)) / rate) / 100
      : 0,
    changeKhr: difference > 0
      ? Math.floor(difference / 100)
      : 0,
  };
}

