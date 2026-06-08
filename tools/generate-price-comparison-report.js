import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import mongoose from 'mongoose';
import { connectDatabase } from '../api/config/db.js';
import { Game } from '../api/models/Game.js';
import { Package } from '../api/models/Package.js';

const reportGames = [
  {
    slug: 'mobile-legends',
    sourceUrl: 'https://kiragamestore.com/games/mobile-khmer',
    kira: [
      ['Twilight', 8.2],
      ['11', 0.23],
      ['Weekly', 1.53],
      ['22', 0.4],
      ['55', 0.85],
      ['86', 1.29],
      ['165', 2.45],
      ['172', 2.55],
      ['257', 3.69, '234+23 Diamond'],
      ['275', 3.8],
      ['706', 9.69],
      ['565', 7.65],
      ['2195', 29.49],
      ['3688', 49.5],
      ['5532', 73.5],
      ['9288', 123],
      ['Weekly Elite Pack', 0.85, 'Weekly Elite Bundle'],
      ['Monthly Elite Pack', 4.19, 'Monthly Epic Bundle'],
      ['343', 4.89],
      ['429', 6.15],
      ['514', 7.19],
      ['600', 8.49],
      ['792', 10.99],
      ['878', 12.19],
      ['963', 13.19],
      ['1050', 14.69, '1049 Diamond'],
      ['1136', 15.89, '1135 Diamond'],
      ['1222', 17.15, '1220 Diamond'],
      ['1412', 19.45],
      ['1584', 21.69],
      ['1756', 24.35, '1755 Diamond'],
      ['2539', 34.45, '2538 Diamond'],
      ['2901', 39],
      ['4394', 59.5],
      ['6238', 83.5],
      ['7727', 104.5],
      ['11483', 153]
    ]
  },
  {
    slug: 'honor-of-kings',
    sourceUrl: 'https://kiragamestore.com/games/hornor-of-king',
    kira: [
      ['Weekly Card Plus', 3.2],
      ['Weekly Card', 1.15, 'Weekly Crad'],
      ['16', 0.25],
      ['80', 1],
      ['240', 2.7],
      ['400', 4.5],
      ['560', 6.5],
      ['830', 9.5],
      ['1245', 13.5],
      ['2508', 27],
      ['4180', 45],
      ['8360', 88]
    ]
  },
  {
    slug: 'pubg-mobile',
    sourceUrl: 'https://kiragamestore.com/games/pubg-mobile',
    kira: [
      ['325', 4.75, '325 UC fast'],
      ['3850', 47, '3850 UC fast'],
      ['60', 1, '60 UC fast'],
      ['660', 9.5, '660 UC fast'],
      ['8100', 92, '8100 UC fast'],
      ['1800', 23, '1800 UC fast'],
      ['Prime (3 Months)', 3, 'Prime 3Month'],
      ['Prime (1 Month)', 1, 'Prime 1 Month'],
      ['Weekly Deal Pack 1', 1],
      ['Upgradable Firearm Materials Pack', 3, 'Upgradable Firearm'],
      ['Mythic Emblem Pack', 5],
      ['Elite Pass LV1-50', 5.69, 'Elite Pass 1lvl -50lvl'],
      ['Elite Pass Plus LV1-100', 26, 'Elite pass plus 1-100 lvl'],
      ['First Purchase Pack', 0.95],
      ['Weekly Deal Pack 2', 2.78],
      ['Weekly Mythic Emblem Value Pack', 3.49],
      ['Prime Plus (3 Months)', 26.99],
      ['Prime (6 Months)', 5.49],
      ['Prime Plus (6 Months)', 53.09]
    ]
  },
  {
    slug: 'free-fire',
    sourceUrl: 'https://kiragamestore.com/games/free-fire-khmer',
    kira: [
      ['Monthly Membership', 7.35, 'Monthly Pass x1'],
      ['Weekly Membership', 1.59, 'Weekly Pass X1'],
      ['Weekly Lite', 0.4, 'Weekly Lite X1'],
      ['Evo Access 3D', 0.6, 'Evo Acess 3day'],
      ['Evo Access 7D', 1, 'Evo Acess 7day'],
      ['Evo Access 30D', 2.49, 'Evo Acess 30day'],
      ['Level Up Package - Level 6', 0.35, 'level 6'],
      ['Level Up Package - Level 10', 0.7, 'level 10'],
      ['Level Up Package - Level 15', 0.7, 'level 15'],
      ['Level Up Package - Level 20', 0.7, 'Level 20'],
      ['Level Up Package - Level 25', 0.7, 'level 25'],
      ['Level Up Package - Level 30', 0.7, 'level 30'],
      ['1060', 8.39, '1060 Diamond'],
      ['25', 0.3, '25 Diamonds'],
      ['100', 0.99, '100 Diamonds'],
      ['310', 2.8, '310 Diamaond'],
      ['520', 4.39, '520 Diamond'],
      ['2180', 16.79, '2180 Diamond'],
      ['5600', 39.99, '5600 Diamond'],
      ['11500', 79.99, '11500 Diamond']
    ]
  }
];

function usd(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `$${Number(value).toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function statusClass(value) {
  if (value === null || value === undefined) return 'unknown';
  if (value < 0) return 'loss';
  if (value < 0.15) return 'thin';
  return 'ok';
}

function buildKiraMap(entries) {
  const map = new Map();
  for (const [key, price, label] of entries) {
    map.set(String(key).toLowerCase(), { price, label: label || key });
  }
  return map;
}

function findKiraPrice(pkg, kiraMap) {
  const candidates = [
    pkg.providerCatalogueName,
    pkg.amountLabel,
    pkg.name
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  for (const candidate of candidates) {
    if (kiraMap.has(candidate)) return kiraMap.get(candidate);
  }

  const numeric = String(pkg.providerCatalogueName || '').match(/^\d+$/)?.[0];
  if (numeric && kiraMap.has(numeric)) return kiraMap.get(numeric);

  return null;
}

function htmlDocument({ rows, generatedAt }) {
  const gameSections = reportGames.map((game) => {
    const gameRows = rows.filter((row) => row.slug === game.slug);
    return `
      <section class="game">
        <h2>${escapeHtml(gameRows[0]?.gameName || game.slug)}</h2>
        <p class="source">Kira source: ${escapeHtml(game.sourceUrl)}</p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Package</th>
              <th>Category</th>
              <th>G2Bulk price</th>
              <th>Our price</th>
              <th>Our fee from G2B</th>
              <th>Kira price</th>
              <th>Margin if using Kira</th>
              <th>Kira match</th>
            </tr>
          </thead>
          <tbody>
            ${gameRows.map((row, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(row.packageName)}</td>
                <td>${escapeHtml(row.category)}</td>
                <td class="num">${usd(row.g2bulkPrice)}</td>
                <td class="num">${usd(row.ourPrice)}</td>
                <td class="num ${statusClass(row.ourFee)}">${usd(row.ourFee)}</td>
                <td class="num">${usd(row.kiraPrice)}</td>
                <td class="num ${statusClass(row.kiraMargin)}">${usd(row.kiraMargin)}</td>
                <td>${escapeHtml(row.kiraLabel || '-')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>
    `;
  }).join('');

  const matched = rows.filter((row) => row.kiraPrice !== null).length;
  const losses = rows.filter((row) => row.kiraMargin !== null && row.kiraMargin < 0).length;
  const thin = rows.filter((row) => row.kiraMargin !== null && row.kiraMargin >= 0 && row.kiraMargin < 0.15).length;

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>FinchUP Price Comparison</title>
      <style>
        @page { size: A4 landscape; margin: 10mm; }
        body { font-family: Arial, sans-serif; color: #111827; font-size: 10px; }
        h1 { margin: 0 0 4px; font-size: 22px; }
        h2 { margin: 18px 0 4px; font-size: 16px; }
        .meta { color: #4b5563; margin-bottom: 8px; }
        .summary { display: flex; gap: 8px; margin: 12px 0; }
        .card { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; min-width: 120px; }
        .card strong { display: block; font-size: 14px; }
        .source { color: #6b7280; margin: 0 0 6px; }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th, td { border: 1px solid #d1d5db; padding: 4px 5px; vertical-align: top; }
        th { background: #f3f4f6; text-align: left; font-size: 9px; }
        td.num { text-align: right; white-space: nowrap; }
        .ok { color: #047857; }
        .thin { color: #b45309; }
        .loss { color: #b91c1c; font-weight: 700; }
        .unknown { color: #6b7280; }
        .note { margin-top: 12px; color: #4b5563; line-height: 1.45; }
      </style>
    </head>
    <body>
      <h1>FinchUP Price Comparison: G2Bulk vs Our Price vs Kira</h1>
      <div class="meta">Generated: ${escapeHtml(generatedAt)} | Games: MLBB, HOK, PUBG Mobile, Free Fire</div>
      <div class="summary">
        <div class="card"><strong>${rows.length}</strong>Total FinchUP packages</div>
        <div class="card"><strong>${matched}</strong>Matched Kira packages</div>
        <div class="card"><strong>${losses}</strong>Loss if copying Kira</div>
        <div class="card"><strong>${thin}</strong>Thin margin (&lt; $0.15)</div>
      </div>
      <div class="note">
        "G2Bulk price" is FinchUP supplier cost from the current database after live G2Bulk sync.
        "Our fee from G2B" is current FinchUP sale price minus G2Bulk supplier cost.
        "Margin if using Kira" is Kira price minus G2Bulk supplier cost before payment gateway, refund, FX, and support costs.
        Blank Kira prices mean no verified matching Kira package was found on the extracted page text.
      </div>
      ${gameSections}
    </body>
  </html>`;
}

async function main() {
  await connectDatabase();

  const rows = [];
  for (const reportGame of reportGames) {
    const game = await Game.findOne({ slug: reportGame.slug }).lean();
    const packages = await Package.find({ game: game._id, active: true }).sort({ sortOrder: 1, priceUsd: 1 }).lean();
    const kiraMap = buildKiraMap(reportGame.kira);

    for (const pkg of packages) {
      const kira = findKiraPrice(pkg, kiraMap);
      const g2bulkPrice = Number(pkg.supplierCostUsd || 0);
      const ourPrice = Number(pkg.priceUsd || 0);
      const kiraPrice = kira ? Number(kira.price) : null;
      rows.push({
        slug: reportGame.slug,
        gameName: game.name,
        packageName: pkg.amountLabel || pkg.name,
        category: pkg.packageCategory || 'item-package',
        g2bulkPrice,
        ourPrice,
        ourFee: ourPrice - g2bulkPrice,
        kiraPrice,
        kiraMargin: kiraPrice === null ? null : kiraPrice - g2bulkPrice,
        kiraLabel: kira?.label || ''
      });
    }
  }

  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const html = htmlDocument({ rows, generatedAt });
  const outDir = path.resolve('docs');
  await fs.mkdir(outDir, { recursive: true });
  const htmlPath = path.join(outDir, 'g2bulk-kira-price-comparison.html');
  const pdfPath = path.join(outDir, 'g2bulk-kira-price-comparison.pdf');
  await fs.writeFile(htmlPath, html, 'utf8');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    landscape: true,
    printBackground: true,
    margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
  });
  await browser.close();

  console.log(`Wrote ${htmlPath}`);
  console.log(`Wrote ${pdfPath}`);
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
