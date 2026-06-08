import { checkG2BulkDeliveryStatus, submitG2BulkDelivery } from './g2bulk.js';
import { notifyAdmin, notifyBuyer, notifySystem, formatOrder } from './telegram.js';

const finalDeliveryStatuses = ['submitted', 'completed'];

export async function deliverPaidOrder(order) {
  if (!order) return order;
  if (finalDeliveryStatuses.includes(order.delivery?.status)) return order;

  order.status = 'processing';
  order.delivery = {
    ...(order.delivery?.toObject?.() || order.delivery || {}),
    provider: 'g2bulk',
    status: 'pending'
  };
  await order.save();

  try {
    const result = await submitG2BulkDelivery(order);
    order.delivery = {
      ...(order.delivery?.toObject?.() || order.delivery || {}),
      provider: result.provider || 'g2bulk',
      gameCode: result.gameCode,
      catalogueName: result.catalogueName,
      externalOrderId: result.externalOrderId,
      status: result.status,
      rawResponse: result.rawResponse,
      error: result.error,
      submittedAt: ['submitted', 'completed'].includes(result.status) ? new Date() : order.delivery?.submittedAt,
      deliveredAt: result.status === 'completed' ? new Date() : order.delivery?.deliveredAt
    };

    if (result.status === 'completed') order.status = 'completed';
    if (result.status === 'failed') order.status = 'failed';
    if (result.status === 'not_configured') order.status = 'processing';

    await order.save();

    if (['submitted', 'completed'].includes(result.status)) {
      await notifyAdmin(`Delivery submitted\n\n${formatOrder(order)}`);
      await notifyBuyer(order, `Delivery processing\n\n${formatOrder(order)}`);
    } else if (result.status === 'not_configured') {
      await notifySystem(`Delivery not configured for ${order.orderNo}: ${result.error}`);
    } else if (result.status === 'failed') {
      await notifySystem(`Delivery failed for ${order.orderNo}: ${result.error || 'Provider rejected order'}`);
    }
  } catch (error) {
    order.status = 'processing';
    order.delivery = {
      ...(order.delivery?.toObject?.() || order.delivery || {}),
      provider: 'g2bulk',
      status: 'failed',
      error: error.response?.data?.message || error.message,
      rawResponse: error.response?.data
    };
    await order.save();
    await notifySystem(`Delivery error for ${order.orderNo}: ${order.delivery.error}`);
  }

  return order;
}

export async function refreshDeliveryStatus(order) {
  if (!order) return order;
  if (order.delivery?.provider !== 'g2bulk') return order;
  if (!order.delivery?.externalOrderId || !order.delivery?.gameCode) return order;
  if (order.delivery?.status === 'completed' || order.delivery?.status === 'failed') return order;

  try {
    const result = await checkG2BulkDeliveryStatus({
      gameCode: order.delivery.gameCode,
      externalOrderId: order.delivery.externalOrderId
    });

    order.delivery = {
      ...(order.delivery?.toObject?.() || order.delivery || {}),
      status: result.status,
      rawResponse: result.rawResponse,
      error: result.status === 'failed' ? result.rawResponse?.message || 'G2Bulk delivery failed' : undefined,
      deliveredAt: result.status === 'completed' ? new Date() : order.delivery?.deliveredAt
    };

    if (result.status === 'completed') order.status = 'completed';
    if (result.status === 'failed') order.status = 'failed';
    await order.save();

    if (result.status === 'completed') {
      await notifyBuyer(order, `Delivery completed\n\n${formatOrder(order)}`);
    } else if (result.status === 'failed') {
      await notifySystem(`Delivery failed for ${order.orderNo}: ${order.delivery.error || 'Provider failed order'}`);
    }
  } catch (error) {
    order.delivery = {
      ...(order.delivery?.toObject?.() || order.delivery || {}),
      error: error.response?.data?.message || error.message,
      rawResponse: error.response?.data || order.delivery?.rawResponse
    };
    await order.save();
  }

  return order;
}
