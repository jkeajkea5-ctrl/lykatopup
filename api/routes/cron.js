import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { deleteExpiredUnpaidOrders } from '../services/orderCleanup.js';

const router = Router();

function isAuthorizedCron(req) {
  if (!process.env.CRON_SECRET) return true;
  return req.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
}

router.get(
  '/cleanup-unpaid-orders',
  asyncHandler(async (req, res) => {
    if (!isAuthorizedCron(req)) return res.status(401).json({ message: 'Unauthorized cron request' });
    const result = await deleteExpiredUnpaidOrders();
    res.json({ ok: true, ...result });
  })
);

export default router;

