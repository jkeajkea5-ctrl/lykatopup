import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getPublicBootstrap, getPublicStorefront, publicCacheControl } from '../services/publicCatalog.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', publicCacheControl);
    res.json(await getPublicStorefront());
  })
);

router.get(
  '/bootstrap',
  asyncHandler(async (_req, res) => {
    res.set('Cache-Control', publicCacheControl);
    res.json(await getPublicBootstrap());
  })
);

export default router;
