import 'dotenv/config';
import { connectDatabase } from '../api/config/db.js';
import { Game } from '../api/models/Game.js';
import { Package } from '../api/models/Package.js';

const sourceBaseUrl = (process.env.FINCHUP_PRICE_SOURCE_URL || 'https://finchup.store').replace(/\/+$/, '');

function key(value) {
  return String(value || '').trim().toLowerCase();
}

function packageKeys(pkg = {}) {
  return [
    pkg.providerCatalogueName,
    pkg.amountLabel,
    pkg.name
  ].map(key).filter(Boolean);
}

function sourcePriceMap(sourcePackages = []) {
  const map = new Map();
  for (const pkg of sourcePackages) {
    for (const itemKey of packageKeys(pkg)) {
      if (!map.has(itemKey)) {
        map.set(itemKey, Number(pkg.priceUsd));
      }
    }
  }
  return map;
}

async function fetchSourceGame(slug) {
  const response = await fetch(`${sourceBaseUrl}/api/games/${encodeURIComponent(slug)}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`FinchUP price fetch failed for ${slug}: ${response.status}`);
  return response.json();
}

async function syncGame(game) {
  const source = await fetchSourceGame(game.slug);
  if (!source?.packages?.length) {
    return { slug: game.slug, skipped: true, reason: 'no_source_packages', matched: 0, unmatched: 0 };
  }

  const prices = sourcePriceMap(source.packages);
  const packages = await Package.find({ game: game._id });
  let matched = 0;
  let changed = 0;
  let unmatched = 0;

  for (const pkg of packages) {
    const matchedPrice = packageKeys(pkg).map((itemKey) => prices.get(itemKey)).find((price) => Number.isFinite(price));
    if (!Number.isFinite(matchedPrice)) {
      unmatched += 1;
      continue;
    }

    matched += 1;
    const nextPrice = Number(matchedPrice.toFixed(2));
    if (Number(pkg.priceUsd) !== nextPrice) {
      pkg.priceUsd = nextPrice;
      await pkg.save();
      changed += 1;
    }
  }

  return { slug: game.slug, game: game.name, sourcePackages: source.packages.length, matched, changed, unmatched };
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await connectDatabase();
  const games = await Game.find({ active: true }).sort({ sortOrder: 1, name: 1 });
  const results = [];

  for (const game of games) {
    const result = await syncGame(game);
    results.push(result);
    if (result.skipped) {
      console.log(`skip ${result.slug}: ${result.reason}`);
    } else {
      console.log(`${result.game}: matched ${result.matched}/${result.sourcePackages}, changed ${result.changed}, unmatched local ${result.unmatched}`);
    }
  }

  const changed = results.reduce((sum, result) => sum + (result.changed || 0), 0);
  const matched = results.reduce((sum, result) => sum + (result.matched || 0), 0);
  console.log(`updated ${changed} prices from FinchUP across ${matched} matched packages`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
