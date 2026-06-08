import { Router } from 'express';
import { z } from 'zod';
import { Game } from '../models/Game.js';
import { Package } from '../models/Package.js';
import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { optionalAuth, requireAdmin, requireAuth } from '../middleware/auth.js';
import { checkGameUsername } from '../services/gameUsername.js';
import { createKhqrPayment } from '../services/tola.js';
import { refreshDeliveryStatus } from '../services/delivery.js';
import { formatOrder, notifyAdmin, notifyBuyer, notifySystem } from '../services/telegram.js';
import { packageAvailabilityFilter } from '../utils/packageRules.js';

const router = Router();

const createOrderSchema = z.object({
  body: z.object({
    gameId: z.string().min(10),
    packageId: z.string().min(10),
    accountInfo: z.record(z.string().trim().min(1)),
    contact: z
      .object({
        email: z.string().email().optional().or(z.literal('')),
        telegramUsername: z.string().optional(),
        telegramChatId: z.string().optional()
      })
      .optional()
  }),
  params: z.object({}).passthrough(),
  query: z.object({}).passthrough()
});

function orderNo() {
  return `LY${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

function paymentStatusForOrderStatus(status) {
  if (['paid', 'processing', 'completed'].includes(status)) return 'paid';
  if (status === 'cancelled') return 'refunded';
  if (status === 'failed') return 'failed';
  return 'pending';
}

async function refreshVisibleDeliveryStatuses(orders) {
  const refreshable = orders.filter(
    (order) =>
      order.status === 'processing' &&
      order.delivery?.provider === 'g2bulk' &&
      ['pending', 'submitted'].includes(order.delivery?.status) &&
      order.delivery?.externalOrderId
  );

  await Promise.all(refreshable.slice(0, 10).map((order) => refreshDeliveryStatus(order)));
}

router.post(
  '/',
  optionalAuth,
  validate(createOrderSchema),
  asyncHandler(async (req, res) => {
    const game = await Game.findOne({ _id: req.body.gameId, active: true });
    const pkg = await Package.findOne({ _id: req.body.packageId, game: req.body.gameId, ...packageAvailabilityFilter() });
    if (!game || !pkg) return res.status(404).json({ message: 'Game or package is unavailable' });

    const usernameResult = await checkGameUsername(game, req.body.accountInfo);
    if (!usernameResult.found) return res.status(422).json({ message: usernameResult.message || 'Username check failed' });

    const order = await Order.create({
      orderNo: orderNo(),
      ...(req.auth?.role === 'buyer' ? { user: req.auth.sub } : {}),
      game: game._id,
      package: pkg._id,
      gameName: game.name,
      packageName: `${pkg.name} - ${pkg.amountLabel}`,
      priceUsd: pkg.priceUsd,
      accountInfo: req.body.accountInfo,
      gameUsername: usernameResult.username,
      contact: req.body.contact || {}
    });

    try {
      const khqr = await createKhqrPayment({ orderNo: order.orderNo, amountUsd: order.priceUsd });
      const payment = await Payment.create({
        order: order._id,
        amountUsd: order.priceUsd,
        status: 'pending',
        ...khqr
      });
      order.payment = payment._id;
      await order.save();
      await notifyAdmin(`New order received\n\n${formatOrder(order)}`);
      await notifyBuyer(order, `Order created\n\n${formatOrder(order)}`);
      res.status(201).json({ order, payment });
    } catch (error) {
      await notifySystem(`KHQR generation failed for ${order.orderNo}: ${error.message}`);
      throw error;
    }
  })
);

router.get(
  '/mine',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.auth.role !== 'buyer') return res.status(403).json({ message: 'Buyer account required' });
    const orders = await Order.find({ user: req.auth.sub }).populate('payment').sort({ createdAt: -1 }).limit(100);
    await refreshVisibleDeliveryStatuses(orders);
    res.json(orders);
  })
);

router.get(
  '/status/:orderNo',
  asyncHandler(async (req, res) => {
    const order = await Order.findOne({ orderNo: req.params.orderNo }).populate('payment').populate('game').populate('package');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await refreshVisibleDeliveryStatuses([order]);
    res.json({ order });
  })
);

router.get(
  '/',
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const orders = await Order.find().populate('payment').sort({ createdAt: -1 }).limit(200);
    await refreshVisibleDeliveryStatuses(orders);
    res.json(orders);
  })
);

router.patch(
  '/:id/status',
  requireAdmin,
  validate(
    z.object({
      params: z.object({ id: z.string().min(10) }),
      body: z.object({
        status: z.enum(['pending_payment', 'paid', 'processing', 'completed', 'failed', 'cancelled']),
        notes: z.string().optional()
      }),
      query: z.object({}).passthrough()
    })
  ),
  asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.payment) {
      const paymentStatus = paymentStatusForOrderStatus(order.status);
      const paymentUpdate = { status: paymentStatus };
      if (paymentStatus === 'paid') paymentUpdate.paidAt = new Date();
      await Payment.findByIdAndUpdate(order.payment, paymentUpdate);
    }
    await notifyBuyer(order, `Order status updated\n\n${formatOrder(order)}`);
    res.json(await order.populate('payment'));
  })
);

router.delete(
  '/:id',
  requireAdmin,
  validate(
    z.object({
      params: z.object({ id: z.string().min(10) }),
      body: z.object({}).passthrough(),
      query: z.object({}).passthrough()
    })
  ),
  asyncHandler(async (req, res) => {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    await Payment.deleteMany({ order: order._id });
    res.json({ ok: true });
  })
);

export default router;
