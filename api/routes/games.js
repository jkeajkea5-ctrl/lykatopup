import { Router } from 'express';
import { z } from 'zod';
import { Game } from '../models/Game.js';
import { Package } from '../models/Package.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkGameUsername } from '../services/gameUsername.js';
import { validate } from '../middleware/validate.js';
import { getCache, setCache } from '../utils/cache.js';
import { packageAvailabilityFilter } from '../utils/packageRules.js';
import { compactPublicGame, getPublicGames, getPublicStorefront, publicCacheControl, publicGameDetailProjection, publicPackageProjection } from '../services/publicCatalog.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const includeDisabled = req.query.includeDisabled === 'true';
    if (includeDisabled) {
      res.set('Cache-Control', 'private, no-store');
    } else {
      res.set('Cache-Control', publicCacheControl);
    }
    if (!includeDisabled) return res.json(await getPublicGames());

    const games = await Game.find(includeDisabled ? {} : { active: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();
    const counts = await Package.aggregate([
      { $match: { game: { $in: games.map((game) => game._id) }, ...packageAvailabilityFilter(includeDisabled) } },
      { $group: { _id: '$game', packageCount: { $sum: 1 }, lowestPrice: { $min: '$priceUsd' } } }
    ]);
    const countMap = new Map(counts.map((item) => [String(item._id), item]));
    const payload = games.map((game) => {
      const summary = countMap.get(String(game._id));
      return {
        ...game,
        packageCount: summary?.packageCount || 0,
        lowestPrice: summary?.lowestPrice ?? null
      };
    });
    res.json(payload);
  })
);

router.get(
  '/:slug',
  asyncHandler(async (req, res) => {
    res.set('Cache-Control', publicCacheControl);
    const cacheKey = `public:game:${req.params.slug}`;
    const cached = getCache(cacheKey);
    if (cached) return res.json(cached);

    const [game, storefront] = await Promise.all([
      Game.findOne({ slug: req.params.slug, active: true }).select(publicGameDetailProjection).lean(),
      getPublicStorefront()
    ]);
    if (!game) return res.status(404).json({ message: 'Game not found' });
    const packages = await Package.find({ game: game._id, ...packageAvailabilityFilter() })
      .select(publicPackageProjection)
      .sort({ sortOrder: 1, priceUsd: 1 })
      .lean();
    res.json(setCache(cacheKey, { game: compactPublicGame(game), packages, currency: storefront.currency || 'USD' }, 5 * 60 * 1000));
  })
);

router.post(
  '/:slug/check-username',
  validate(
    z.object({
      params: z.object({ slug: z.string().min(1) }),
      body: z.object({ accountInfo: z.record(z.string().trim().min(1)) }),
      query: z.object({}).passthrough()
    })
  ),
  asyncHandler(async (req, res) => {
    const game = await Game.findOne({ slug: req.params.slug, active: true });
    if (!game) return res.status(404).json({ message: 'Game not found' });
    const result = await checkGameUsername(game, req.body.accountInfo);
    res.status(result.found ? 200 : 404).json(result);
  })
);

export default router;
