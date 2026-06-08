import { Router } from 'express';
import { z } from 'zod';
import { Game } from '../models/Game.js';
import { Package } from '../models/Package.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { validate } from '../middleware/validate.js';
import { packageAvailabilityFilter } from '../utils/packageRules.js';

const router = Router();

router.get(
  '/',
  validate(
    z.object({
      params: z.object({}).passthrough(),
      query: z
        .object({
          game: z.string().optional(),
          gameSlug: z.string().optional(),
          includeDisabled: z.string().optional()
        })
        .passthrough(),
      body: z.any().optional()
    })
  ),
  asyncHandler(async (req, res) => {
    const includeDisabled = req.query.includeDisabled === 'true';
    const filter = packageAvailabilityFilter(includeDisabled);

    if (req.query.game) {
      filter.game = req.query.game;
    }

    if (req.query.gameSlug) {
      const game = await Game.findOne({ slug: req.query.gameSlug, ...(includeDisabled ? {} : { active: true }) });
      if (!game) return res.status(404).json({ message: 'Game not found' });
      filter.game = game._id;
    }

    const packages = await Package.find(filter).populate('game', 'name slug active').sort({ sortOrder: 1, priceUsd: 1 });
    res.json(packages);
  })
);

router.get(
  '/:id',
  validate(
    z.object({
      params: z.object({ id: z.string().min(10) }),
      query: z.object({}).passthrough(),
      body: z.any().optional()
    })
  ),
  asyncHandler(async (req, res) => {
    const pkg = await Package.findOne({ _id: req.params.id, ...packageAvailabilityFilter() }).populate('game', 'name slug active');
    if (!pkg || pkg.game?.active === false) return res.status(404).json({ message: 'Package not found' });
    res.json(pkg);
  })
);

export default router;
