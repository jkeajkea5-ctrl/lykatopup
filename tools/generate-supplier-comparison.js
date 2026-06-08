import fs from 'node:fs/promises';
import path from 'node:path';

const g2bulkGames = {
  mlbb: 'Mobile Legends',
  pubgm: 'PUBG Mobile',
  freefire_sgmy: 'Free Fire MYSG'
};

const kiraRows = [
  ['Mobile Legends', 'mlbb', '55', 0.85],
  ['Mobile Legends', 'mlbb', 'Weekly Elite Pack', 0.85],
  ['Mobile Legends', 'mlbb', '86', 1.35],
  ['Mobile Legends', 'mlbb', 'Weekly', 1.54],
  ['Mobile Legends', 'mlbb', '165', 2.45],
  ['Mobile Legends', 'mlbb', '172', 2.55],
  ['Mobile Legends', 'mlbb', '257', 3.69],
  ['Mobile Legends', 'mlbb', '275', 3.83],
  ['Mobile Legends', 'mlbb', 'Monthly Elite Pack', 4.19],
  ['Mobile Legends', 'mlbb', '343', 4.89],
  ['Mobile Legends', 'mlbb', '429', 6.15],
  ['Mobile Legends', 'mlbb', '514', 7.19],
  ['Mobile Legends', 'mlbb', '565', 7.75],
  ['Mobile Legends', 'mlbb', 'Twilight', 8.2],
  ['Mobile Legends', 'mlbb', '600', 8.49],
  ['Mobile Legends', 'mlbb', '706', 9.69],
  ['Mobile Legends', 'mlbb', '792', 10.99],
  ['Mobile Legends', 'mlbb', '878', 12.19],
  ['Mobile Legends', 'mlbb', '963', 13.59],
  ['Mobile Legends', 'mlbb', '1050', 14.69],
  ['Mobile Legends', 'mlbb', '1136', 15.89],
  ['Mobile Legends', 'mlbb', '1222', 17.39],
  ['Mobile Legends', 'mlbb', '1412', 20.1],
  ['Mobile Legends', 'mlbb', '1584', 22.09],
  ['Mobile Legends', 'mlbb', '1756', 25.1],
  ['Mobile Legends', 'mlbb', '2195', 29.49],
  ['Mobile Legends', 'mlbb', '2539', 35.09],
  ['Mobile Legends', 'mlbb', '2901', 39.5],
  ['Mobile Legends', 'mlbb', '3688', 49.5],
  ['Mobile Legends', 'mlbb', '5532', 74.5],
  ['Mobile Legends', 'mlbb', '6238', 83.5],
  ['Mobile Legends', 'mlbb', '7727', 104.5],
  ['Mobile Legends', 'mlbb', '9288', 123],
  ['Mobile Legends', 'mlbb', '11483', 153],
  ['PUBG Mobile', 'pubgm', '60', 1],
  ['PUBG Mobile', 'pubgm', 'First Purchase Pack', 0.95],
  ['PUBG Mobile', 'pubgm', 'Prime (1 Month)', 1],
  ['PUBG Mobile', 'pubgm', 'Weekly Deal Pack 1', 1],
  ['PUBG Mobile', 'pubgm', 'Upgradable Firearm Materials Pack', 3],
  ['PUBG Mobile', 'pubgm', 'Prime (3 Months)', 3],
  ['PUBG Mobile', 'pubgm', 'Weekly Mythic Emblem Value Pack', 3.49],
  ['PUBG Mobile', 'pubgm', 'Weekly Deal Pack 2', 2.78],
  ['PUBG Mobile', 'pubgm', '325', 4.75],
  ['PUBG Mobile', 'pubgm', 'Mythic Emblem Pack', 5],
  ['PUBG Mobile', 'pubgm', 'Prime (6 Months)', 5.49],
  ['PUBG Mobile', 'pubgm', 'Elite Pass LV1-50', 5.69],
  ['PUBG Mobile', 'pubgm', '660', 9.5],
  ['PUBG Mobile', 'pubgm', '1800', 23],
  ['PUBG Mobile', 'pubgm', 'Elite Pass Plus LV1-100', 26],
  ['PUBG Mobile', 'pubgm', 'Prime Plus (3 Months)', 26.99],
  ['PUBG Mobile', 'pubgm', '3850', 47],
  ['PUBG Mobile', 'pubgm', 'Prime Plus (6 Months)', 53.09],
  ['PUBG Mobile', 'pubgm', '8100', 92],
  ['Free Fire', 'freefire_sgmy', '25', 0.3],
  ['Free Fire', 'freefire_sgmy', 'WeeklyLite', 0.4],
  ['Free Fire', 'freefire_sgmy', 'Level Up Package - Level 6', 0.35],
  ['Free Fire', 'freefire_sgmy', 'Evo Access 3D', 0.6],
  ['Free Fire', 'freefire_sgmy', 'Level Up Package - Level 10', 0.7],
  ['Free Fire', 'freefire_sgmy', 'Level Up Package - Level 15', 0.7],
  ['Free Fire', 'freefire_sgmy', 'Level Up Package - Level 20', 0.7],
  ['Free Fire', 'freefire_sgmy', 'Level Up Package - Level 25', 0.7],
  ['Free Fire', 'freefire_sgmy', 'Evo Access 7D', 1],
  ['Free Fire', 'freefire_sgmy', '100', 0.99],
  ['Free Fire', 'freefire_sgmy', 'Level Up Package - Level 30', 0.7],
  ['Free Fire', 'freefire_sgmy', 'Weekly', 1.59],
  ['Free Fire', 'freefire_sgmy', 'Evo Access 30D', 2.49],
  ['Free Fire', 'freefire_sgmy', '310', 2.8],
  ['Free Fire', 'freefire_sgmy', '520', 4.39],
  ['Free Fire', 'freefire_sgmy', 'Monthly', 7.35],
  ['Free Fire', 'freefire_sgmy', '1060', 8.39],
  ['Free Fire', 'freefire_sgmy', '2180', 16.79],
  ['Free Fire', 'freefire_sgmy', '5600', 39.99],
  ['Free Fire', 'freefire_sgmy', '11500', 79.99]
];

const camResellerFreeFire = [
  ['WeeklyLite', 0.45, 'Weekly Lite'],
  ['Weekly', 1.69, 'Weekly Pass'],
  ['Monthly', 7.69, 'Monthly Pass'],
  ['Evo Access 3D', 0.65, 'EVO 3 Days'],
  ['Evo Access 7D', 0.95, 'EVO 7 Days'],
  ['Evo Access 30D', 2.75, 'EVO 30 Days'],
  ['100', 0.89, '100 Diamonds'],
  ['310', 2.69, '310 Diamonds'],
  ['520', 4.39, '520 Diamonds'],
  ['1060', 8.69, '1060 Diamonds'],
  ['2180', 17.39, '2180 Diamonds'],
  ['5600', 39.49, '5600 Diamonds'],
  ['11500', 78.99, '11500 Diamonds']
];

function csvEscape(value) {
  const string = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function num(value) {
  return value === '' || value === null || value === undefined || Number.isNaN(Number(value))
    ? ''
    : Number(value).toFixed(3);
}

function key(code, item) {
  return `${code}:${String(item).toLowerCase()}`;
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function main() {
  const g2 = new Map();
  for (const [code, gameName] of Object.entries(g2bulkGames)) {
    const data = await fetchJson(`https://api.g2bulk.com/v1/games/${code}/catalogue`);
    for (const item of data.catalogues || []) {
      g2.set(key(code, item.name), {
        game: gameName,
        code,
        package: String(item.name),
        g2bulk: Number(item.amount)
      });
    }
  }

  const kira = new Map(kiraRows.map(([game, code, item, price]) => [key(code, item), { game, code, item, price }]));
  const cam = new Map(camResellerFreeFire.map(([item, price, label]) => [key('freefire_sgmy', item), { price, label }]));

  const rows = [];
  for (const base of g2.values()) {
    const kiraItem = kira.get(key(base.code, base.package));
    const camItem = cam.get(key(base.code, base.package));
    const candidates = [
      ['G2Bulk', base.g2bulk],
      ['Kira', kiraItem?.price],
      ['Our camreseller/Jury', camItem?.price]
    ].filter(([, price]) => price !== undefined && price !== null);
    const cheapest = candidates.sort((a, b) => a[1] - b[1])[0];
    rows.push({
      game: base.game,
      code: base.code,
      package: base.package,
      g2bulk: base.g2bulk,
      fazercards: '',
      fazercardsNote: 'Package price not public; reseller login/API needed',
      kira: kiraItem?.price ?? '',
      camreseller: camItem?.price ?? '',
      camresellerLabel: camItem?.label ?? '',
      cheapestSource: cheapest?.[0] ?? '',
      cheapestPrice: cheapest?.[1] ?? ''
    });
  }

  const headers = [
    'Game',
    'Code',
    'Package',
    'G2Bulk USD',
    'FazerCards USD',
    'FazerCards Note',
    'Kira USD',
    'Our camreseller/Jury USD',
    'Camreseller label',
    'Cheapest public source',
    'Cheapest public price USD'
  ];
  const lines = [
    headers.join(','),
    ...rows.map((row) => [
      row.game,
      row.code,
      row.package,
      num(row.g2bulk),
      row.fazercards,
      row.fazercardsNote,
      num(row.kira),
      num(row.camreseller),
      row.camresellerLabel,
      row.cheapestSource,
      num(row.cheapestPrice)
    ].map(csvEscape).join(','))
  ];

  const outDir = path.resolve('docs');
  await fs.mkdir(outDir, { recursive: true });
  const csvPath = path.join(outDir, 'supplier-price-comparison-g2bulk-fazer-kira-camreseller.csv');
  await fs.writeFile(csvPath, lines.join('\n'), 'utf8');
  console.log(`Wrote ${csvPath}`);

  const summary = rows
    .filter((row) => row.camreseller || row.kira)
    .map((row) => ({
      game: row.game,
      package: row.package,
      g2bulk: row.g2bulk,
      kira: row.kira,
      camreseller: row.camreseller,
      cheapest: row.cheapestSource
    }));
  console.table(summary.slice(0, 40));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
