import { Order } from '../models/Order.js';
import { Payment } from '../models/Payment.js';

export const unpaidOrderTtlMs = 24 * 60 * 60 * 1000;

export async function deleteExpiredUnpaidOrders({ now = new Date(), limit = 200 } = {}) {
  const expiresBefore = new Date(now.getTime() - unpaidOrderTtlMs);
  const candidates = await Order.find({
    status: 'pending_payment',
    createdAt: { $lt: expiresBefore }
  })
    .select('_id orderNo payment createdAt')
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();

  if (!candidates.length) {
    return { deletedOrders: 0, deletedPayments: 0, checkedOrders: 0 };
  }

  const orderIds = candidates.map((order) => order._id);
  const paidPayments = await Payment.find({
    order: { $in: orderIds },
    status: 'paid'
  })
    .select('order')
    .lean();
  const paidOrderIds = new Set(paidPayments.map((payment) => String(payment.order)));
  const expiredOrderIds = orderIds.filter((orderId) => !paidOrderIds.has(String(orderId)));

  if (!expiredOrderIds.length) {
    return { deletedOrders: 0, deletedPayments: 0, checkedOrders: candidates.length };
  }

  const [paymentResult, orderResult] = await Promise.all([
    Payment.deleteMany({ order: { $in: expiredOrderIds }, status: { $ne: 'paid' } }),
    Order.deleteMany({ _id: { $in: expiredOrderIds }, status: 'pending_payment' })
  ]);

  return {
    deletedOrders: orderResult.deletedCount || 0,
    deletedPayments: paymentResult.deletedCount || 0,
    checkedOrders: candidates.length
  };
}

