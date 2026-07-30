export const KHQR_ENABLED = (
  String(import.meta.env.VITE_KHQR_ENABLED || '').trim().toLowerCase() === 'true'
);
