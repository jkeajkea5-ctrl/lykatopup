import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    req.auth = null;
  }
  next();
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.auth?.role !== 'admin') return res.status(403).json({ message: 'Admin access required' });
    next();
  });
}
