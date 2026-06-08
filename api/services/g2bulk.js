import axios from 'axios';
import crypto from 'node:crypto';

const DEFAULT_BASE_URL = 'https://api.g2bulk.com';

const gameCodeBySlug = {
  'mobile-legends': 'mlbb',
  'pubg-mobile': 'pubgm',
  'free-fire': 'freefire_sg',
  'honor-of-kings': 'hok',
  'magic-chess-go-go': 'magic_chest_gogo',
  'valorant-cambodia': 'valorant_kh',
  'blood-strike': 'bloodstrike',
  'genshin-impact-cambodia': 'genshin',
  'honkai-star-rail': 'honkai_star_rail',
  'zenless-zone-zero': 'zzz',
  'wuthering-waves': 'wuwa',
  'delta-force': 'deltaforce',
  'arena-breakout': 'arena_breakout',
  'call-of-duty-mobile-garena': 'codm_sgmy',
  'identity-v': 'identityv',
  'wild-rift-cambodia': 'wild_rift_kh',
  'farlight-84': 'farlight84',
  zepeto: 'zepeto'
};

function config() {
  return {
    enabled: process.env.G2BULK_DELIVERY_ENABLED === 'true',
    apiKey: process.env.G2BULK_API_KEY || '',
    baseUrl: (process.env.G2BULK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
    callbackUrl: process.env.G2BULK_CALLBACK_URL || ''
  };
}

function extractCatalogueName(order) {
  const source = `${order.packageName || ''}`.replace(/\s+-\s+/g, ' ');
  const match = source.match(/\b\d+\b/);
  if (match) return match[0];

  const normalized = source.toLowerCase();
  if (normalized.includes('weekly')) return 'Weekly';
  if (normalized.includes('twilight')) return 'Twilight';
  if (normalized.includes('monthly elite')) return 'Monthly Elite Pack';
  if (normalized.includes('weekly elite')) return 'Weekly Elite Pack';
  if (normalized.includes('limited-time')) return 'Limited-Time Value Pack';

  return '';
}

function normalizeStatus(data) {
  const status = String(data?.status || data?.data?.status || data?.order?.status || '').toLowerCase();
  if (['success', 'successful', 'completed', 'complete', 'delivered', 'paid'].includes(status)) return 'completed';
  if (['failed', 'error', 'cancelled', 'canceled', 'refunded'].includes(status)) return 'failed';
  return 'submitted';
}

function normalizeExternalOrderId(data) {
  return (
    data?.order_id ||
    data?.orderId ||
    data?.id ||
    data?.data?.order_id ||
    data?.data?.orderId ||
    data?.data?.id ||
    data?.order?.id ||
    data?.order?.order_id
  );
}

function idempotencyKey(orderNo) {
  const hash = crypto.createHash('sha256').update(String(orderNo)).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export function getG2BulkDeliveryPlan(order) {
  const gameSlug = typeof order.game === 'object' ? order.game?.slug : undefined;
  const gameCode = order.package?.providerGameCode || gameCodeBySlug[gameSlug];
  if (!gameCode) return null;

  const catalogueName = order.package?.providerCatalogueName || extractCatalogueName(order);
  if (!catalogueName) return null;

  return {
    provider: 'g2bulk',
    gameCode,
    catalogueName
  };
}

export async function submitG2BulkDelivery(order) {
  const cfg = config();
  if (!cfg.enabled) {
    return { status: 'not_configured', error: 'G2Bulk delivery is disabled' };
  }
  if (!cfg.apiKey) {
    return { status: 'not_configured', error: 'G2BULK_API_KEY is not configured' };
  }

  const plan = getG2BulkDeliveryPlan(order);
  if (!plan) {
    return { status: 'not_configured', error: 'No G2Bulk mapping for this game/package' };
  }

  const accountInfo = order.accountInfo || {};
  const playerId = accountInfo.get?.('userId') || accountInfo.userId;
  const serverId = accountInfo.get?.('serverId') || accountInfo.serverId;

  if (!playerId) {
    return { status: 'failed', error: 'Missing player userId' };
  }

  const needsServerId = ['mlbb', 'magic_chest_gogo', 'genshin', 'honkai_star_rail', 'zzz', 'wuwa', 'identityv'].includes(plan.gameCode);
  if (needsServerId && !serverId) {
    return { status: 'failed', error: `Missing serverId for ${plan.gameCode}` };
  }

  const payload = {
    catalogue_name: plan.catalogueName,
    player_id: String(playerId),
    remark: `Lyka Topup ${order.orderNo}`
  };

  if (serverId) payload.server_id = String(serverId);

  if (cfg.callbackUrl) payload.callback_url = cfg.callbackUrl;

  const response = await axios.post(`${cfg.baseUrl}/v1/games/${plan.gameCode}/order`, payload, {
    timeout: 30000,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-API-Key': cfg.apiKey,
      'X-Idempotency-Key': idempotencyKey(order.orderNo)
    }
  });

  return {
    ...plan,
    status: normalizeStatus(response.data),
    externalOrderId: normalizeExternalOrderId(response.data),
    rawResponse: response.data
  };
}

export async function checkG2BulkDeliveryStatus({ gameCode, externalOrderId }) {
  const cfg = config();
  if (!cfg.apiKey) {
    return { status: 'not_configured', error: 'G2BULK_API_KEY is not configured' };
  }
  if (!gameCode || !externalOrderId) {
    return { status: 'not_configured', error: 'Missing G2Bulk game code or order id' };
  }

  const response = await axios.post(
    `${cfg.baseUrl}/v1/games/order/status`,
    { game: gameCode, order_id: /^\d+$/.test(String(externalOrderId)) ? Number(externalOrderId) : externalOrderId },
    {
      timeout: 20000,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-API-Key': cfg.apiKey
      }
    }
  );

  return {
    status: normalizeStatus(response.data),
    rawResponse: response.data,
    providerStatus: response.data?.order?.status
  };
}
