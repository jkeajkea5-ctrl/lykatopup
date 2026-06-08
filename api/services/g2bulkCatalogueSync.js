import { Game } from '../models/Game.js';
import { Package } from '../models/Package.js';
import { clearCache } from '../utils/cache.js';
import { activeForPackage } from '../utils/packageRules.js';

const DEFAULT_BASE_URL = 'https://api.g2bulk.com';

export const cambodiaG2BulkGames = {
  'mobile-legends': { code: 'mlbb', suffix: 'Diamonds' },
  'pubg-mobile': { code: 'pubgm', suffix: 'UC' },
  'free-fire': { code: 'freefire_sgmy', suffix: 'Diamonds' },
  'honor-of-kings': { code: 'hok', suffix: 'Tokens' },
  'magic-chess-go-go': { code: 'magic_chess_gogo', suffix: 'Diamonds' },
  'valorant-cambodia': { code: 'valorant_kh', suffix: 'VP' },
  'blood-strike': { code: 'bloodstrike', suffix: 'Gold' },
  'genshin-impact-cambodia': { code: 'genshin', suffix: 'Genesis Crystals' },
  'honkai-star-rail': { code: 'honkai_star_rail', suffix: 'Oneiric Shards' },
  'zenless-zone-zero': { code: 'zzz', suffix: 'Monochrome' },
  'wuthering-waves': { code: 'wuwa', suffix: 'Lunites' },
  'delta-force': { code: 'deltaforce', suffix: 'Delta Coins' },
  'arena-breakout': { code: 'arena_breakout', suffix: 'Bonds' },
  'call-of-duty-mobile-garena': { code: 'codm_sgmy', suffix: 'CP' },
  'identity-v': { code: 'identityv', suffix: 'Echoes' },
  'wild-rift-cambodia': { code: 'wild_rift_kh', suffix: 'Wild Cores' },
  'farlight-84': { code: 'farlight84', suffix: 'Diamonds' },
  zepeto: { code: 'zepeto', suffix: 'ZEMS' }
};

const fieldOverrides = {
  'genshin-impact-cambodia': [
    { key: 'userId', label: 'Player ID', placeholder: '10000001', required: true },
    { key: 'serverId', label: 'Server', placeholder: 'Asia / America / Europe / TW_HK_MO', required: true }
  ]
};

function baseUrl() {
  return (process.env.G2BULK_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');
}

function markupPercent() {
  return Number(process.env.G2BULK_PACKAGE_MARKUP_PERCENT || 12);
}

function salePrice(cost) {
  const markedUp = cost * (1 + markupPercent() / 100);
  return Number(Math.max(markedUp, cost + 0.05).toFixed(2));
}

function amountLabel(catalogue, suffix) {
  return /^\d+$/.test(String(catalogue.name)) ? `${catalogue.name} ${suffix}` : String(catalogue.name);
}

function bonusLabel(catalogueName) {
  const source = String(catalogueName).toLowerCase();
  if (source.includes('weekly')) return 'Weekly';
  if (source.includes('monthly') || source.includes('subscription') || source.includes('membership')) return 'Monthly';
  if (source.includes('pass')) return 'Pass';
  if (source.includes('value') || source.includes('bundle') || source.includes('pack')) return 'Special';
  return '';
}

function packageCategory(catalogue, suffix) {
  const catalogueName = String(catalogue.name || '');
  const label = amountLabel(catalogue, suffix);
  const source = `${catalogueName} ${label}`.toLowerCase();
  const suffixLower = String(suffix || '').toLowerCase();
  const suffixSingular = suffixLower.endsWith('s') ? suffixLower.slice(0, -1) : suffixLower;

  if (/\b(pass|weekly|monthly|membership|subscription|prime|twilight)\b/.test(source)) {
    return 'pass';
  }

  if (
    /^\s*\d+\s*$/.test(catalogueName) ||
    source.includes(suffixLower) ||
    (suffixSingular && source.includes(suffixSingular))
  ) {
    return 'item-package';
  }

  return 'other';
}

async function getCatalogue(code) {
  const response = await fetch(`${baseUrl()}/v1/games/${code}/catalogue`);
  if (!response.ok) throw new Error(`G2Bulk catalogue failed for ${code}: ${response.status}`);
  const data = await response.json();
  if (!data.success) throw new Error(`G2Bulk catalogue failed for ${code}`);
  const catalogues = data.catalogues || [];
  if (!catalogues.length) throw new Error(`G2Bulk catalogue is empty for ${code}`);
  return catalogues;
}

export async function syncG2BulkGamePackages(slug) {
  const plan = cambodiaG2BulkGames[slug];
  if (!plan) throw new Error(`Unsupported G2Bulk Cambodia game: ${slug}`);

  const game = await Game.findOne({ slug });
  if (!game) return { slug, skipped: true, reason: 'game_not_found', packages: 0, deleted: 0 };

  if (fieldOverrides[slug]) {
    game.requiredFields = fieldOverrides[slug];
  }
  if (game.currencyLabel !== plan.suffix) {
    game.currencyLabel = plan.suffix;
  }
  await game.save();

  const catalogue = await getCatalogue(plan.code);
  const liveCatalogueNames = catalogue.map((item) => String(item.name));
  await Package.updateMany({ game: game._id }, { $set: { active: false } });

  for (const [index, item] of catalogue.entries()) {
    const supplierCostUsd = Number(item.amount);
    const packagePayload = {
      game: game._id,
      name: amountLabel(item, plan.suffix),
      amountLabel: amountLabel(item, plan.suffix),
      packageCategory: packageCategory(item, plan.suffix),
      priceUsd: salePrice(supplierCostUsd),
      supplierCostUsd,
      deliveryProvider: 'g2bulk',
      providerGameCode: plan.code,
      providerCatalogueName: String(item.name),
      providerCatalogueId: item.id,
      bonusLabel: bonusLabel(item.name),
      sortOrder: index + 1
    };

    await Package.findOneAndUpdate(
      { game: game._id, providerGameCode: plan.code, providerCatalogueName: String(item.name) },
      {
        $set: {
          ...packagePayload,
          active: activeForPackage(packagePayload)
        }
      },
      { upsert: true, new: true }
    );
  }

  const deleteResult = await Package.deleteMany({
    game: game._id,
    $or: [
      { providerGameCode: { $ne: plan.code } },
      { providerCatalogueName: { $nin: liveCatalogueNames } }
    ]
  });

  clearCache('public:');
  return {
    slug,
    game: game.name,
    providerGameCode: plan.code,
    packages: catalogue.length,
    deleted: deleteResult.deletedCount || 0
  };
}

export async function syncAllG2BulkCambodiaPackages() {
  const results = [];
  for (const slug of Object.keys(cambodiaG2BulkGames)) {
    results.push(await syncG2BulkGamePackages(slug));
  }
  return {
    games: results.length,
    packages: results.reduce((sum, item) => sum + (item.packages || 0), 0),
    deleted: results.reduce((sum, item) => sum + (item.deleted || 0), 0),
    results
  };
}
