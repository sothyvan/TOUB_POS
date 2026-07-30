export function httpError(message, status = 400, code) {
  const error = new Error(message);
  error.status = status;
  if (code) {
    error.code = code;
  }
  return error;
}
