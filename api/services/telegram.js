import { TelegramSetting } from '../models/TelegramSetting.js';

async function getTelegramConfig() {
  const setting = await TelegramSetting.findOne().select('+buyerBotToken +adminBotToken +notificationBotToken');
  return {
    buyerBotToken: process.env.TELEGRAM_BOT_TOKEN_BUYER || setting?.buyerBotToken,
    adminBotToken: process.env.TELEGRAM_BOT_TOKEN_ADMIN || setting?.adminBotToken,
    notificationBotToken: process.env.TELEGRAM_BOT_TOKEN_NOTIFICATION || setting?.notificationBotToken,
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID || setting?.adminChatId,
    enabled: setting?.enabled ?? true
  };
}

async function send(token, chatId, text) {
  if (!token || !chatId) return;
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    })
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Telegram send failed: ${details}`);
  }
}

export async function notifyBuyer(order, message) {
  const config = await getTelegramConfig();
  if (!config.enabled) return;
  const chatId = order.contact?.telegramChatId;
  await send(config.buyerBotToken, chatId, message);
}

export async function notifyAdmin(message) {
  const config = await getTelegramConfig();
  if (!config.enabled) return;
  await send(config.adminBotToken, config.adminChatId, message);
}

export async function notifySystem(message) {
  const config = await getTelegramConfig();
  if (!config.enabled) return;
  await send(config.notificationBotToken, config.adminChatId, message);
}

export function formatOrder(order) {
  return [
    `<b>Lyka Topup Order ${order.orderNo}</b>`,
    `Game: ${order.gameName}`,
    `Package: ${order.packageName}`,
    `Player: ${order.gameUsername}`,
    `Amount: $${order.priceUsd.toFixed(2)}`,
    `Status: ${order.status}`
  ].join('\n');
}
