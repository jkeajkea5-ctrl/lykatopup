import 'dotenv/config';

const baseUrl = (process.env.FULFILLMENT_POLL_BASE_URL || process.env.CLIENT_URL || 'https://lykatopup.store').replace(/\/+$/, '');
const cronSecret = process.env.CRON_SECRET || '';
const deliveryIntervalMs = Math.max(Number(process.env.FULFILLMENT_DELIVERY_POLL_SECONDS || 5), 5) * 1000;
const paymentIntervalMs = Math.max(Number(process.env.FULFILLMENT_PAYMENT_POLL_SECONDS || 30), 5) * 1000;

let deliveryRunning = false;
let paymentRunning = false;

function headers() {
  return cronSecret ? { Authorization: `Bearer ${cronSecret}` } : {};
}

async function poll(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: headers(),
    signal: AbortSignal.timeout(60000)
  });

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { body: text };
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(data)}`);
  }

  return data;
}

async function runDeliveryPoll() {
  if (deliveryRunning) return;
  deliveryRunning = true;
  try {
    const result = await poll('/api/cron/poll-deliveries');
    if (result.count || result.refreshed?.length) {
      console.log(`[delivery] refreshed ${result.count}: ${JSON.stringify(result.refreshed)}`);
    }
  } catch (error) {
    console.error(`[delivery] ${error.message}`);
  } finally {
    deliveryRunning = false;
  }
}

async function runPaymentPoll() {
  if (paymentRunning) return;
  paymentRunning = true;
  try {
    const result = await poll('/api/cron/poll-payments?limit=50');
    if (result.paid || result.errors) {
      console.log(`[payment] checked ${result.checked}/${result.scanned}, paid ${result.paid}, errors ${result.errors}`);
    }
  } catch (error) {
    console.error(`[payment] ${error.message}`);
  } finally {
    paymentRunning = false;
  }
}

console.log(`Polling ${baseUrl}`);
console.log(`Delivery interval: ${deliveryIntervalMs / 1000}s`);
console.log(`Payment interval: ${paymentIntervalMs / 1000}s`);

await Promise.all([runDeliveryPoll(), runPaymentPoll()]);
setInterval(runDeliveryPoll, deliveryIntervalMs);
setInterval(runPaymentPoll, paymentIntervalMs);
