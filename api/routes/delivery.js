import { Router } from 'express';
import { z } from 'zod';
import { Order } from '../models/Order.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { refreshDeliveryStatus } from '../services/delivery.js';
import { notifyBuyer, notifySystem, formatOrder } from '../services/telegram.js';

const router = Router();

router.post(
  '/g2bulk/poll',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const orders = await Order.find({
      status: 'processing',
      'delivery.provider': 'g2bulk',
      'delivery.status': { $in: ['pending', 'submitted'] },
      'delivery.externalOrderId': { $exists: true, $ne: '' }
    }).limit(50);

    const refreshed = [];
    for (const order of orders) {
      const result = await refreshDeliveryStatus(order);
      refreshed.push({
        orderNo: result.orderNo,
        status: result.status,
        deliveryStatus: result.delivery?.status,
        externalOrderId: result.delivery?.externalOrderId
      });
    }

    res.json({ refreshed });
  })
);

const g2bulkCallbackSchema = z.object({
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough(),
  body: z
    .object({
      order_id: z.union([z.string(), z.number()]).optional(),
      game_code: z.string().optional(),
      status: z.string().optional(),
      message: z.string().optional(),
      remark: z.string().optional()
    })
    .passthrough()
});

function orderNoFromRemark(remark) {
  const match = String(remark || '').match(/\bLY[A-Z0-9]+\b/);
  return match?.[0];
}

function normalizeDeliveryStatus(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'completed') return 'completed';
  if (normalized === 'failed') return 'failed';
  return 'submitted';
}

router.post(
  '/g2bulk/callback',
  validate(g2bulkCallbackSchema),
  asyncHandler(async (req, res) => {
    const callbackSecret = process.env.G2BULK_CALLBACK_SECRET;
    if (callbackSecret) {
      const providedSecret = req.get('x-callback-secret') || req.query.secret;
      if (providedSecret !== callbackSecret) return res.status(401).json({ message: 'Invalid callback secret' });
    }

    const externalOrderId = req.body.order_id ? String(req.body.order_id) : '';
    const orderNo = orderNoFromRemark(req.body.remark);
    const query = orderNo ? { orderNo } : { 'delivery.externalOrderId': externalOrderId };
    const order = await Order.findOne(query);
    if (!order) {
      await notifySystem(`G2Bulk callback did not match an order: ${JSON.stringify(req.body)}`);
      return res.json({ ok: true });
    }

    const deliveryStatus = normalizeDeliveryStatus(req.body.status);
    order.delivery = {
      ...(order.delivery?.toObject?.() || order.delivery || {}),
      provider: 'g2bulk',
      gameCode: req.body.game_code || order.delivery?.gameCode,
      externalOrderId: externalOrderId || order.delivery?.externalOrderId,
      status: deliveryStatus,
      rawResponse: req.body,
      error: deliveryStatus === 'failed' ? req.body.message || 'G2Bulk delivery failed' : order.delivery?.error,
      deliveredAt: deliveryStatus === 'completed' ? new Date() : order.delivery?.deliveredAt
    };

    if (deliveryStatus === 'completed') order.status = 'completed';
    if (deliveryStatus === 'failed') order.status = 'failed';
    await order.save();

    if (deliveryStatus === 'completed') {
      await notifyBuyer(order, `Delivery completed\n\n${formatOrder(order)}`);
    } else if (deliveryStatus === 'failed') {
      await notifySystem(`G2Bulk delivery failed for ${order.orderNo}: ${req.body.message || 'No message'}`);
    }

    res.json({ ok: true });
  })
);

export default router;
