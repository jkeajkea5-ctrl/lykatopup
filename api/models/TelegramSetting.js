import mongoose from 'mongoose';

const telegramSettingSchema = new mongoose.Schema(
  {
    buyerBotToken: { type: String, select: false },
    adminBotToken: { type: String, select: false },
    notificationBotToken: { type: String, select: false },
    adminChatId: String,
    enabled: { type: Boolean, default: true }
  },
  { timestamps: true }
);

export const TelegramSetting =
  mongoose.models.TelegramSetting || mongoose.model('TelegramSetting', telegramSettingSchema);
