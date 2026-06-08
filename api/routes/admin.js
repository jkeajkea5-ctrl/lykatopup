import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { Game } from '../models/Game.js';
import { Package } from '../models/Package.js';
import { Order } from '../models/Order.js';
import { Admin } from '../models/Admin.js';
import { User } from '../models/User.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { clearCache } from '../utils/cache.js';
import { activeForPackage, packageAvailabilityFilter } from '../utils/packageRules.js';
import { syncAllG2BulkCambodiaPackages, syncG2BulkGamePackages } from '../services/g2bulkCatalogueSync.js';

const router = Router();
router.use(requireAdmin);
const defaultGameCategories = [
  { name: 'MOBA', slug: 'moba', active: true, color: '#ff9f2d', icon: 'moba', sortOrder: 1 },
  { name: 'RPG', slug: 'rpg', active: true, color: '#8b5dff', icon: 'rpg', sortOrder: 2 },
  { name: 'Survival', slug: 'survival', active: true, color: '#22c55e', icon: 'survival', sortOrder: 3 },
  { name: 'Battle Royale', slug: 'battle-royale', active: true, color: '#ef4444', icon: 'battle-royale', sortOrder: 4 },
  { name: 'FPS', slug: 'fps', active: true, color: '#4f8bff', icon: 'fps', sortOrder: 5 },
  { name: 'Strategy', slug: 'strategy', active: true, color: '#f59e0b', icon: 'strategy', sortOrder: 6 }
];

const requiredField = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  placeholder: z.string().optional(),
  required: z.boolean().default(true)
});

const usernameApi = z
  .object({
    enabled: z.boolean().default(false),
    method: z.enum(['GET', 'POST']).default('GET'),
    url: z.string().optional(),
    headers: z.record(z.string()).optional(),
    bodyTemplate: z.record(z.string()).optional(),
    usernamePath: z.string().optional()
  })
  .optional();

const packageBody = z.object({
  game: z.string().min(10),
  name: z.string().min(1),
  amountLabel: z.string().min(1),
  packageCategory: z.enum(['item-package', 'pass', 'other']).default('item-package'),
  priceUsd: z.coerce.number().min(0),
  supplierCostUsd: z.coerce.number().min(0).optional(),
  deliveryProvider: z.string().optional(),
  providerGameCode: z.string().optional(),
  providerCatalogueName: z.string().optional(),
  providerCatalogueId: z.coerce.number().optional(),
  bonusLabel: z.string().optional(),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().optional()
});

const packageUpdateBody = z.object({
  game: z.string().min(10).optional(),
  name: z.string().min(1).optional(),
  amountLabel: z.string().min(1).optional(),
  packageCategory: z.enum(['item-package', 'pass', 'other']).optional(),
  priceUsd: z.coerce.number().min(0).optional(),
  supplierCostUsd: z.coerce.number().min(0).optional(),
  deliveryProvider: z.string().optional(),
  providerGameCode: z.string().optional(),
  providerCatalogueName: z.string().optional(),
  providerCatalogueId: z.coerce.number().optional(),
  bonusLabel: z.string().optional(),
  active: z.boolean().optional(),
  sortOrder: z.coerce.number().optional()
});

router.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const [games, packagesCount, orders, paidOrders] = await Promise.all([
      Game.countDocuments(),
      Package.countDocuments(),
      Order.countDocuments(),
      Order.find({ status: { $in: ['paid', 'processing', 'completed'] } })
    ]);
    const revenue = paidOrders.reduce((sum, order) => sum + order.priceUsd, 0);
    res.json({ games, packages: packagesCount, orders, revenue });
  })
);

router.get(
  '/games',
  asyncHandler(async (_req, res) => {
    const games = await Game.find().sort({ sortOrder: 1, name: 1 }).lean();
    const counts = await Package.aggregate([
      { $match: { game: { $in: games.map((game) => game._id) }, ...packageAvailabilityFilter() } },
      { $group: { _id: '$game', packageCount: { $sum: 1 }, lowestPrice: { $min: '$priceUsd' } } }
    ]);
    const countMap = new Map(counts.map((item) => [String(item._id), item]));
    res.json({
      games: games.map((game) => {
        const summary = countMap.get(String(game._id));
        return {
          ...game,
          packageCount: summary?.packageCount || 0,
          lowestPrice: summary?.lowestPrice ?? null
        };
      })
    });
  })
);

router.get(
  '/orders',
  asyncHandler(async (_req, res) => {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(1000).lean();
    res.json({ orders });
  })
);

router.post(
  '/games',
  validate(
    z.object({
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
      body: z.object({
        name: z.string().min(1),
        slug: z.string().min(1),
        shortName: z.string().optional(),
        category: z.string().optional(),
        currencyLabel: z.string().optional(),
        publisher: z.string().optional(),
        imageUrl: z.string().optional(),
        description: z.string().optional(),
        active: z.boolean().default(true),
        featured: z.boolean().optional(),
        requiredFields: z.array(requiredField).min(1),
        usernameApi,
        sortOrder: z.number().optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const game = await Game.create(req.body);
    clearCache('public:');
    res.status(201).json(game);
  })
);

const gameUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  shortName: z.string().optional(),
  category: z.string().optional(),
  currencyLabel: z.string().optional(),
  publisher: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  requiredFields: z.array(requiredField).min(1).optional(),
  usernameApi,
  sortOrder: z.number().optional()
});

router.patch(
  '/games/:id',
  validate(
    z.object({
      params: z.object({ id: z.string().min(10) }),
      query: z.object({}).passthrough(),
      body: gameUpdateSchema
    })
  ),
  asyncHandler(async (req, res) => {
    const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!game) return res.status(404).json({ message: 'Game not found' });
    clearCache('public:');
    res.json(game);
  })
);

router.get(
  '/users',
  asyncHandler(async (_req, res) => {
    const [users, orders] = await Promise.all([
      User.find().sort({ updatedAt: -1 }).limit(200),
      Order.find().sort({ createdAt: -1 }).limit(1000)
    ]);

    const orderGroups = orders.reduce((acc, order) => {
      const key = (order.contact?.email || order.gameUsername || order.orderNo || String(order._id)).toLowerCase();
      if (!acc[key]) {
        acc[key] = {
          key,
          name: order.gameUsername || order.contact?.email?.split('@')[0] || 'Guest Buyer',
          email: order.contact?.email || '',
          orders: 0,
          spent: 0,
          lastOrderAt: order.createdAt
        };
      }
      acc[key].orders += 1;
      if (['paid', 'processing', 'completed'].includes(order.status)) acc[key].spent += Number(order.priceUsd || 0);
      if (new Date(order.createdAt) > new Date(acc[key].lastOrderAt)) acc[key].lastOrderAt = order.createdAt;
      return acc;
    }, {});

    const userRows = users.map((user) => {
      const doc = user.toObject();
      const keys = [doc.email, doc.name, doc.providers?.telegramUsername].filter(Boolean).map((value) => value.toLowerCase());
      const stats = keys.map((key) => orderGroups[key]).find(Boolean);
      keys.forEach((key) => {
        if (orderGroups[key]) delete orderGroups[key];
      });
      const lastActivity = stats?.lastOrderAt || doc.lastLoginAt || doc.updatedAt || doc.createdAt;
      const inactive = lastActivity && Date.now() - new Date(lastActivity).getTime() > 14 * 24 * 60 * 60 * 1000;
      const status = doc.status && doc.status !== 'active' ? doc.status : inactive ? 'inactive' : 'active';
      return {
        ...doc,
        orderCount: stats?.orders || 0,
        totalSpent: stats?.spent || 0,
        status,
        lastActivityAt: lastActivity
      };
    });

    const guestRows = Object.values(orderGroups).map((group) => ({
      _id: `guest-${group.key}`,
      name: group.name,
      email: group.email || 'Guest checkout',
      avatar: '',
      role: 'buyer',
      orderCount: group.orders,
      totalSpent: group.spent,
      status: 'active',
      createdAt: group.lastOrderAt,
      updatedAt: group.lastOrderAt,
      lastActivityAt: group.lastOrderAt
    }));

    res.json([...userRows, ...guestRows].sort((left, right) => new Date(right.lastActivityAt || right.updatedAt) - new Date(left.lastActivityAt || left.updatedAt)));
  })
);

router.patch(
  '/users/:id/status',
  validate(
    z.object({
      params: z.object({ id: z.string().min(10) }),
      body: z.object({ status: z.enum(['active', 'suspended', 'banned']) }),
      query: z.object({}).passthrough()
    })
  ),
  asyncHandler(async (req, res) => {
    const user = await User.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  })
);

router.get(
  '/storefront',
  asyncHandler(async (_req, res) => {
    const settings = await SystemSetting.findOne();
    res.json({
      slides: settings?.slides || [],
      catalog: settings?.catalog || { featuredGameSlugs: [], categories: defaultGameCategories }
    });
  })
);

router.put(
  '/storefront/catalog',
  validate(
    z.object({
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
      body: z.object({
        featuredGameSlugs: z.array(z.string()).optional(),
        featuredOnly: z.boolean().optional(),
        flashTitle: z.string().optional(),
        flashSubtitle: z.string().optional(),
        flashCtaLabel: z.string().optional(),
        categories: z.array(
          z.object({
            name: z.string().optional(),
            slug: z.string().optional(),
            active: z.boolean().optional(),
            color: z.string().optional(),
            icon: z.string().optional(),
            imageUrl: z.string().optional(),
            sortOrder: z.number().optional()
          })
        ).optional()
      })
    })
  ),
  asyncHandler(async (req, res) => {
    const settings = await SystemSetting.findOneAndUpdate(
      {},
      {
        $set: {
          catalog: {
            featuredGameSlugs: req.body.featuredGameSlugs || [],
            featuredOnly: req.body.featuredOnly || false,
            flashTitle: req.body.flashTitle || 'Flash Sale Today!',
            flashSubtitle: req.body.flashSubtitle || 'Up to 30% off on selected games',
            flashCtaLabel: req.body.flashCtaLabel || 'View',
            categories: req.body.categories || []
          }
        }
      },
      { upsert: true, new: true }
    );
    clearCache('public:');
    res.json(settings.catalog);
  })
);

router.delete(
  '/games/:id',
  asyncHandler(async (req, res) => {
    await Package.deleteMany({ game: req.params.id });
    const game = await Game.findByIdAndDelete(req.params.id);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    clearCache('public:');
    res.json({ ok: true });
  })
);

router.get(
  '/packages',
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.game) filter.game = req.query.game;
    if (req.query.active === 'true') filter.active = true;
    if (req.query.active === 'false') filter.active = false;
    res.json(await Package.find(filter).populate('game', 'name slug active').sort({ sortOrder: 1, createdAt: -1 }));
  })
);

router.post(
  '/packages/sync-g2bulk',
  validate(
    z.object({
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
      body: z.object({ gameSlug: z.string().min(1).optional() }).default({})
    })
  ),
  asyncHandler(async (req, res) => {
    const { gameSlug } = req.validated.body;
    const result = gameSlug ? await syncG2BulkGamePackages(gameSlug) : await syncAllG2BulkCambodiaPackages();
    res.json(result);
  })
);

router.post(
  '/packages',
  validate(
    z.object({
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
      body: packageBody
    })
  ),
  asyncHandler(async (req, res) => {
    const payload = { ...req.validated.body };
    payload.active = activeForPackage(payload);
    const pkg = await Package.create(payload);
    clearCache('public:');
    res.status(201).json(pkg);
  })
);

router.patch(
  '/packages/:id',
  validate(
    z.object({
      params: z.object({ id: z.string().min(10) }),
      query: z.object({}).passthrough(),
      body: packageUpdateBody
    })
  ),
  asyncHandler(async (req, res) => {
    const existing = await Package.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ message: 'Package not found' });
    const payload = { ...req.validated.body };
    const nextPackage = { ...existing, ...payload };
    payload.active = activeForPackage(nextPackage);
    const pkg = await Package.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    clearCache('public:');
    res.json(pkg);
  })
);

router.delete(
  '/packages/:id',
  asyncHandler(async (req, res) => {
    const pkg = await Package.findByIdAndDelete(req.params.id);
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    clearCache('public:');
    res.json({ ok: true });
  })
);

router.post(
  '/admins',
  validate(
    z.object({
      params: z.object({}).passthrough(),
      query: z.object({}).passthrough(),
      body: z.object({ name: z.string().optional(), email: z.string().email(), password: z.string().min(8) })
    })
  ),
  asyncHandler(async (req, res) => {
    const admin = await Admin.create({
      name: req.body.name,
      email: req.body.email,
      passwordHash: await bcrypt.hash(req.body.password, 12)
    });
    res.status(201).json({ id: admin._id, email: admin.email, name: admin.name });
  })
);

export default router;
