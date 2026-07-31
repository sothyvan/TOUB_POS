export const CURRENT_FINANCIAL_POLICY = Object.freeze({
  serviceFeesEnabled: false,
  taxesEnabled: false,
  totalRule: 'item_subtotal_only',
});

export function calculateCurrentDisplayTotal(subtotal) {
  const amount = Number(subtotal);
  return Number.isFinite(amount) ? amount : 0;
}

