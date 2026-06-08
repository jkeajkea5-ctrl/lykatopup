import 'dotenv/config';
import { connectDatabase } from '../api/config/db.js';
import { Order } from '../api/models/Order.js';
import { refreshDeliveryStatus } from '../api/services/delivery.js';

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await connectDatabase();

  const orders = await Order.find({
    status: 'processing',
    'delivery.provider': 'g2bulk',
    'delivery.status': { $in: ['pending', 'submitted'] },
    'delivery.externalOrderId': { $exists: true, $ne: '' }
  }).limit(50);

  for (const order of orders) {
    const result = await refreshDeliveryStatus(order);
    console.log(`${result.orderNo}\t${result.status}\t${result.delivery?.status}\t${result.delivery?.externalOrderId}`);
  }

  if (!orders.length) console.log('No G2Bulk deliveries to poll.');
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
