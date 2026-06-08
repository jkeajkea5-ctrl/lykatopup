import { Router } from 'express';
import { Payment } from '../models/Payment.js';
import { Order } from '../models/Order.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkKhqrPayment } from '../services/tola.js';
import { deliverPaidOrder } from '../services/delivery.js';
import { formatOrder, notifyAdmin, notifyBuyer, notifySystem } from '../services/telegram.js';

const router = Router();

router.post(
  '/:paymentId/check',
  asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.paymentId);
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    const order = await Order.findById(payment.order).populate('game').populate('package');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    try {
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
        if (!wasPaymentPaid || !wasOrderPaid) {
          await notifyAdmin(`Payment confirmed\n\n${formatOrder(order)}`);
          await notifyBuyer(order, `Payment confirmed\n\n${formatOrder(order)}`);
        }
        await deliverPaidOrder(order);
      }
      await payment.save();
      res.json({ payment, order });
    } catch (error) {
      await notifySystem(`Payment status check failed for ${order.orderNo}: ${error.message}`);
      throw error;
    }
  })
);

export default router;
