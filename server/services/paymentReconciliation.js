import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { checkKhqrPayment } from './tola.js';
import { deliverPaidOrder } from './delivery.js';
import { formatOrder, notifyAdmin, notifyBuyer, notifySystem } from './telegram.js';

const pendingPaymentStatuses = ['created', 'pending'];
const activeOrderStatuses = ['pending_payment'];

export async function reconcilePayment(payment) {
  const orderId = payment.order?._id || payment.order;
  const order = await Order.findById(orderId).populate('game').populate('package');
  if (!order) {
    return { payment, order: null, checked: false, paid: false, message: 'Order not found' };
  }

  const result = await checkKhqrPayment(payment);
  const wasOrderPaid = ['paid', 'processing', 'completed'].includes(order.status);
  const wasPaymentPaid = payment.status === 'paid';

  payment.status = result.status;
  payment.rawResponse = result.rawResponse;

  if (result.paid) {
    payment.status = 'paid';
    payment.paidAt ||= new Date();

    if (!wasOrderPaid) {
      order.status = 'paid';
      await order.save();
    }

    await payment.save();
    await deliverPaidOrder(order);

    if (!wasPaymentPaid || !wasOrderPaid) {
      const message = `Payment confirmed\n\n${formatOrder(order, { payment })}`;
      await notifyAdmin(message);
      await notifyBuyer(order, message);
    }
  }

  await payment.save();
  return { payment, order, checked: true, paid: payment.status === 'paid' };
}

export async function reconcilePendingPayments({ limit = 50, maxAgeMinutes = 24 * 60 } = {}) {
  const createdAfter = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const payments = await Payment.find({
    status: { $in: pendingPaymentStatuses },
    createdAt: { $gte: createdAfter }
  })
    .populate({
      path: 'order',
      match: { status: { $in: activeOrderStatuses } },
      select: '_id orderNo status'
    })
    .sort({ createdAt: 1 })
    .limit(limit);

  const checked = [];
  const errors = [];

  for (const payment of payments) {
    if (!payment.order) continue;

    try {
      const result = await reconcilePayment(payment);
      checked.push({
        paymentId: String(payment._id),
        orderNo: result.order?.orderNo,
        paymentStatus: result.payment.status,
        orderStatus: result.order?.status,
        paid: result.paid
      });
    } catch (error) {
      errors.push({
        paymentId: String(payment._id),
        orderNo: payment.order?.orderNo,
        message: error.message
      });
      await notifySystem(`Scheduled payment check failed for ${payment.order?.orderNo || payment._id}: ${error.message}`);
    }
  }

  return {
    scanned: payments.length,
    checked: checked.length,
    paid: checked.filter((item) => item.paid).length,
    errors: errors.length,
    results: checked,
    failures: errors
  };
}
