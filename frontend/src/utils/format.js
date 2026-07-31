export function money(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return '$0.00';
  return `$${num.toFixed(2)}`;
}

export function khrMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '0 ៛';
  return `${Math.round(amount).toLocaleString()} ៛`;
}

function nameAcronym(name, maxLen) {
  if (!name) return '';
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, maxLen)
    .toUpperCase();
}

export function initials(name) {
  return nameAcronym(name, 2);
}

export function suggestedCode(name) {
  return nameAcronym(name, 3);
}
