import { Router } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { TelegramSetting } from '../models/TelegramSetting.js';
import { clearCache } from '../utils/cache.js';

const router = Router();
router.use(requireAdmin);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const system = await SystemSetting.findOne();
    const telegram = await TelegramSetting.findOne().select('+buyerBotToken +adminBotToken +notificationBotToken');
    res.json({
      system,
      telegram: telegram
        ? {
            enabled: telegram.enabled,
            adminChatId: telegram.adminChatId,
            buyerBotConfigured: Boolean(telegram.buyerBotToken || process.env.TELEGRAM_BOT_TOKEN_BUYER),
            adminBotConfigured: Boolean(telegram.adminBotToken || process.env.TELEGRAM_BOT_TOKEN_ADMIN),
            notificationBotConfigured: Boolean(
              telegram.notificationBotToken || process.env.TELEGRAM_BOT_TOKEN_NOTIFICATION
            )
          }
        : null
    });
  })
);

router.put(
  '/system',
  validate(
    z.object({
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
      body: z.object({
        siteName: z.string().min(1),
        currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
        khqr: z.object({
          merchantName: z.string().optional(),
          bakongId: z.string().optional(),
          enabled: z.boolean()
        }),
        maintenanceMode: z.boolean().optional(),
        analyticsAutoReports: z.boolean().optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const setting = await SystemSetting.findOneAndUpdate({}, req.body, { upsert: true, new: true });
    clearCache('public:');
    res.json(setting);
  })
);

router.put(
  '/telegram',
  validate(
    z.object({
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
      body: z.object({
        buyerBotToken: z.string().optional(),
        adminBotToken: z.string().optional(),
        notificationBotToken: z.string().optional(),
        adminChatId: z.string().optional(),
        enabled: z.boolean().optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const cleaned = Object.fromEntries(Object.entries(req.body).filter(([, value]) => value !== ''));
    const setting = await TelegramSetting.findOneAndUpdate({}, cleaned, { upsert: true, new: true });
    res.json({ id: setting._id, enabled: setting.enabled, adminChatId: setting.adminChatId });
  })
);

export default router;
