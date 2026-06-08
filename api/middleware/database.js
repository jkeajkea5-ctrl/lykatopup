import { connectDatabase } from '../config/db.js';

export async function requireDatabase(_req, res, next) {
  if (!process.env.MONGODB_URI) {
    return res.status(503).json({ message: 'Database is not configured' });
  }
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
}
