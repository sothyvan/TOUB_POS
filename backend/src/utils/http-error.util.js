export function httpError(message, status = 400, code) {
  const error = new Error(message);
  error.status = status;
  error.expose = status < 500 || Boolean(code);
  if (code) {
    error.code = code;
  }
  return error;
}
