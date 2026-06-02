export function makeId(prefix) {
  // Use crypto.randomUUID when available 
  // fallback to Date.now() if needed
  const random = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now();
  return `${prefix}-${random}`;
}
