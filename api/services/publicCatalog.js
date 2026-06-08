import { Game } from '../models/Game.js';
import { Package } from '../models/Package.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { getCache, setCache } from '../utils/cache.js';
import { packageAvailabilityFilter } from '../utils/packageRules.js';

export const publicCacheControl = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
export const publicGameListProjection = '-requiredFields -usernameApi -__v';
export const publicGameDetailProjection = '-usernameApi -__v';
export const publicPackageProjection = '-supplierCostUsd -providerCatalogueId -providerGameCode -__v';
const publicCacheTtlMs = 5 * 60 * 1000;

const defaultGameCategories = [
  { name: 'MOBA', slug: 'moba', active: true, color: '#ff9f2d', icon: 'moba', sortOrder: 1 },
  { name: 'RPG', slug: 'rpg', active: true, color: '#8b5dff', icon: 'rpg', sortOrder: 2 },
  { name: 'Survival', slug: 'survival', active: true, color: '#22c55e', icon: 'survival', sortOrder: 3 },
  { name: 'Battle Royale', slug: 'battle-royale', active: true, color: '#ef4444', icon: 'battle-royale', sortOrder: 4 },
  { name: 'FPS', slug: 'fps', active: true, color: '#4f8bff', icon: 'fps', sortOrder: 5 },
  { name: 'Strategy', slug: 'strategy', active: true, color: '#f59e0b', icon: 'strategy', sortOrder: 6 }
];

const publicImageFallbackBySlug = {
  'mobile-legends': '/game-image/mobile-legends.jpg',
  'pubg-mobile': '/game-image/pubg-mobile.jpg',
  'free-fire': '/game-image/free-fire.jpg',
  'honor-of-kings': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/a4/b8/3e/a4b83e06-18af-9786-cdb5-f16ad0fbb340/AppIcon-1x_U007emarketing-0-7-0-85-220-0.png/512x512bb.jpg',
  'magic-chess-go-go': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/3c/f1/28/3cf12800-5937-7c4a-0b1a-52768bb098b2/AppIcon-0-0-1x_U007emarketing-0-7-0-85-220.png/512x512bb.jpg',
  'valorant-cambodia': 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/news/cbf4460132cdfeb2a97fad5f9dd25ba0bc058f76-128x128.png?accountingTag=VAL',
  'blood-strike': 'https://is1-ssl.mzstatic.com/image/thumb/Purple211/v4/1a/fc/32/1afc321b-0a4c-b716-01bc-79977a8b0bc6/AppIcon-0-0-1x_U007emarketing-0-11-0-85-220.png/512x512bb.jpg',
  'genshin-impact-cambodia': 'https://is1-ssl.mzstatic.com/image/thumb/Purple221/v4/df/69/1c/df691ca2-735f-4617-256d-a49202f8db1e/AppIcon-0-0-1x_U007epad-0-1-85-220.png/512x512bb.jpg',
  'honkai-star-rail': 'https://api.g2bulk.com/images/honkai_star_rail.png',
  'zenless-zone-zero': 'https://api.g2bulk.com/images/zzz.png',
  'wuthering-waves': 'https://api.g2bulk.com/images/wuwa.png',
  'delta-force': 'https://api.g2bulk.com/images/deltaforce.png',
  'arena-breakout': 'https://api.g2bulk.com/images/arena_breakout.png',
  'call-of-duty-mobile-garena': 'https://api.g2bulk.com/images/codm_sgmy.png',
  'identity-v': 'https://api.g2bulk.com/images/identityv.png',
  'wild-rift-cambodia': 'https://api.g2bulk.com/images/wild_rift_kh.png',
  'farlight-84': 'https://api.g2bulk.com/images/farlight84.png',
  zepeto: 'https://api.g2bulk.com/images/zepeto.png'
};

function compactImageUrl(imageUrl, slug = '') {
  if (publicImageFallbackBySlug[slug]) return publicImageFallbackBySlug[slug];
  if (!imageUrl) return imageUrl;
  if (!String(imageUrl).startsWith('data:')) return imageUrl;
  return publicImageFallbackBySlug[slug] || '';
}

export function compactPublicGame(game = {}) {
  return {
    ...game,
    imageUrl: compactImageUrl(game.imageUrl, game.slug)
  };
}

function normalizeStorefront(settings) {
  return {
    currency: settings?.currency || 'USD',
    slides: (settings?.slides || [])
      .filter((slide) => slide.active !== false)
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
      .map((slide) => ({
        id: String(slide._id || ''),
        title: slide.title || '',
        subtitle: slide.subtitle || '',
        ctaLabel: slide.ctaLabel || 'Top Up Now',
        imageUrl: slide.imageUrl || '',
        gameSlug: slide.gameSlug || '',
        active: slide.active !== false,
        sortOrder: slide.sortOrder || 0
      })),
    catalog: settings?.catalog || {
      featuredGameSlugs: [],
      featuredOnly: false,
      flashTitle: 'Lyka Topup flash picks',
      flashSubtitle: 'Fresh prices on selected games',
      flashCtaLabel: 'View',
      categories: defaultGameCategories
    }
  };
}

export async function getPublicGames() {
  const cacheKey = 'public:games:active';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const games = await Game.find({ active: true })
    .select(publicGameListProjection)
    .sort({ sortOrder: 1, name: 1 })
    .lean();

  const counts = await Package.aggregate([
    { $match: { game: { $in: games.map((game) => game._id) }, ...packageAvailabilityFilter() } },
    {
      $group: {
        _id: '$game',
        packageCount: { $sum: 1 },
        lowestPrice: { $min: '$priceUsd' }
      }
    }
  ]);
  const countMap = new Map(counts.map((item) => [String(item._id), item]));
  const payload = games.map((game) => {
    const summary = countMap.get(String(game._id));
    return compactPublicGame({
      ...game,
      packageCount: summary?.packageCount || 0,
      lowestPrice: summary?.lowestPrice ?? null
    });
  });

  return setCache(cacheKey, payload, publicCacheTtlMs);
}

export async function getPublicStorefront() {
  const cacheKey = 'public:storefront';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const settings = await SystemSetting.findOne().lean();
  return setCache(cacheKey, normalizeStorefront(settings), publicCacheTtlMs);
}

export async function getPublicBootstrap() {
  const cacheKey = 'public:bootstrap';
  const cached = getCache(cacheKey);
  if (cached) return cached;

  const [games, storefront] = await Promise.all([getPublicGames(), getPublicStorefront()]);
  return setCache(cacheKey, { games, storefront }, publicCacheTtlMs);
}
