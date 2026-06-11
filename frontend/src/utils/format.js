export function money(value) {
  return `$${value.toFixed(2)}`;
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
