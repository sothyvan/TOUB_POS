import jwt from 'jsonwebtoken';

/**
 * Middleware: verify JWT and attach decoded payload to req.user.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Missing or invalid token.' });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token expired or invalid.' });
  }
}

/**
 * Middleware factory: restrict access to one or more roles.
 * Usage: authorize('manager') or authorize('cashier', 'manager')
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions.' });
    }
    next();
  };
}
