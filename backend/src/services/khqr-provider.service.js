import { httpError } from '../utils/http-error.util.js';

export function generateKhqrIndividualPayment() {
  throw httpError(
    'KHQR generation is unavailable until TouB POS integrates an approved payment provider.',
    503,
    'KHQR_PROVIDER_UNAVAILABLE',
  );
}
