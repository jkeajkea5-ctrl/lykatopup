param(
    [string]$OutputDir = "reports",
    [string]$KiraCsv = "docs\four-game-price-comparison.csv"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDirPath = Join-Path $root $OutputDir
$kiraCsvPath = Join-Path $root $KiraCsv
New-Item -ItemType Directory -Force -Path $outDirPath | Out-Null

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$jsonPath = Join-Path $outDirPath "finchup-live-package-prices-with-kira-$dateStamp.json"
$csvPath = Join-Path $outDirPath "finchup-live-package-prices-with-kira-$dateStamp.csv"
$htmlPath = Join-Path $outDirPath "finchup-live-package-prices-with-kira-$dateStamp.html"
$pdfPath = Join-Path $outDirPath "finchup-live-package-prices-with-kira-$dateStamp.pdf"

Push-Location $root
try {
    $nodeScript = @'
import 'dotenv/config';
import fs from 'node:fs';
import mongoose from 'mongoose';
import { connectDatabase } from './api/config/db.js';
import { Game } from './api/models/Game.js';
import { Package } from './api/models/Package.js';

const outJson = process.argv[2];
const outCsv = process.argv[3];
const kiraCsvPath = process.argv[4];

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function parseCsv(source) {
  source = source.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i], next = source[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map((h) => h.replace(/^\uFEFF/, ''));
  return rows.filter((r) => r.length === headers.length).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i]])));
}

function key(game, pkg) {
  return `${game}::${normalize(pkg)}`;
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/membership/g, '')
    .replace(/diamonds?/g, '')
    .replace(/tokens?/g, '')
    .replace(/uc/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const kiraRows = parseCsv(fs.readFileSync(kiraCsvPath, 'utf8'));
const kiraByPackage = new Map();
for (const row of kiraRows) {
  kiraByPackage.set(key(row.Game, row.Package), row);
  if (row['G2Bulk Catalogue']) kiraByPackage.set(key(row.Game, row['G2Bulk Catalogue']), row);
}

await connectDatabase();
const games = await Game.find({ active: true }).sort({ sortOrder: 1, name: 1 }).lean();
const output = [];
for (const game of games) {
  const packages = await Package.find({ game: game._id, active: true }).sort({ sortOrder: 1, priceUsd: 1 }).lean();
  output.push({
    game: {
      name: game.name,
      slug: game.slug,
      currencyLabel: game.currencyLabel,
      category: game.category
    },
    packages: packages.map((pkg) => {
      const matched = kiraByPackage.get(key(game.name, pkg.amountLabel || pkg.name)) ||
        kiraByPackage.get(key(game.name, pkg.providerCatalogueName)) ||
        null;
      const priceUsd = Number(pkg.priceUsd || 0);
      const supplierCostUsd = pkg.supplierCostUsd === undefined || pkg.supplierCostUsd === null ? null : Number(pkg.supplierCostUsd);
      const kiraPriceUsd = matched && matched['Kira Price USD'] ? Number(matched['Kira Price USD']) : null;
      return {
        name: pkg.amountLabel || pkg.name,
        category: pkg.packageCategory || '',
        priceUsd,
        supplierCostUsd,
        feeUsd: supplierCostUsd === null ? null : priceUsd - supplierCostUsd,
        kiraPriceUsd,
        kiraFeeUsd: supplierCostUsd === null || kiraPriceUsd === null ? null : kiraPriceUsd - supplierCostUsd,
        currentVsKiraUsd: kiraPriceUsd === null ? null : priceUsd - kiraPriceUsd,
        kiraMatch: matched?.['Kira Match'] || '',
        provider: pkg.deliveryProvider || '',
        providerGameCode: pkg.providerGameCode || '',
        providerCatalogueName: pkg.providerCatalogueName || ''
      };
    })
  });
}

fs.writeFileSync(outJson, JSON.stringify(output, null, 2), 'utf8');

const lines = [
  ['Game', 'Slug', 'Package', 'Category', 'Price USD', 'Supplier Cost USD', 'Fee USD', 'Kira Price USD', 'Kira Fee USD', 'Current - Kira USD', 'Kira Match', 'Provider', 'Provider Game Code', 'Provider Catalogue'].join(',')
];
for (const section of output) {
  for (const pkg of section.packages) {
    lines.push([
      section.game.name,
      section.game.slug,
      pkg.name,
      pkg.category,
      pkg.priceUsd.toFixed(2),
      pkg.supplierCostUsd === null ? '' : pkg.supplierCostUsd.toFixed(3),
      pkg.feeUsd === null ? '' : pkg.feeUsd.toFixed(3),
      pkg.kiraPriceUsd === null ? '' : pkg.kiraPriceUsd.toFixed(2),
      pkg.kiraFeeUsd === null ? '' : pkg.kiraFeeUsd.toFixed(3),
      pkg.currentVsKiraUsd === null ? '' : pkg.currentVsKiraUsd.toFixed(3),
      pkg.kiraMatch,
      pkg.provider,
      pkg.providerGameCode,
      pkg.providerCatalogueName
    ].map(csvEscape).join(','));
  }
}
fs.writeFileSync(outCsv, lines.join('\n'), 'utf8');
await mongoose.disconnect();
'@

    $nodeScript | node --input-type=module - $jsonPath $csvPath $kiraCsvPath
} finally {
    Pop-Location
}

function HtmlEncode([object]$value) {
    return [System.Net.WebUtility]::HtmlEncode([string]$value)
}

function Money([object]$value, [int]$places = 2) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) {
        return "-"
    }
    return "$" + ([decimal]$value).ToString("0." + ("0" * $places))
}

function FeeClass([object]$value, [decimal]$minimum = 0.12) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) { return "empty" }
    $number = [decimal]$value
    if ($number -lt 0) { return "loss" }
    if ($number -lt $minimum) { return "thin" }
    return "ok"
}

function DeltaClass([object]$value) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) { return "empty" }
    $number = [decimal]$value
    if ($number -lt 0) { return "down" }
    if ($number -gt 0) { return "up" }
    return "same"
}

$data = Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json
$sections = foreach ($section in $data) {
    $packageRows = @($section.packages)
    $body = foreach ($pkg in $packageRows) {
        $feeClass = FeeClass $pkg.feeUsd
        $kiraFeeClass = FeeClass $pkg.kiraFeeUsd
        $deltaClass = DeltaClass $pkg.currentVsKiraUsd
        @"
<tr>
  <td>$(HtmlEncode $pkg.name)</td>
  <td>$(HtmlEncode $pkg.category)</td>
  <td class="num strong">$(Money $pkg.priceUsd 2)</td>
  <td class="num">$(Money $pkg.supplierCostUsd 3)</td>
  <td class="num $feeClass">$(Money $pkg.feeUsd 3)</td>
  <td class="num">$(Money $pkg.kiraPriceUsd 2)</td>
  <td class="num $kiraFeeClass">$(Money $pkg.kiraFeeUsd 3)</td>
  <td class="num $deltaClass">$(Money $pkg.currentVsKiraUsd 3)</td>
  <td>$(HtmlEncode $pkg.kiraMatch)</td>
  <td>$(HtmlEncode $pkg.providerGameCode)</td>
</tr>
"@
    }

    $matchedKira = @($packageRows | Where-Object { $null -ne $_.kiraPriceUsd }).Count
    @"
<section>
  <div class="section-head">
    <h2>$(HtmlEncode $section.game.name)</h2>
    <p>Slug: $(HtmlEncode $section.game.slug) | Packages: $($packageRows.Count) | Kira matches: $matchedKira | Currency: $(HtmlEncode $section.game.currencyLabel)</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Package</th>
        <th>Category</th>
        <th>Price</th>
        <th>Cost</th>
        <th>Fee</th>
        <th>Kira price</th>
        <th>Kira fee</th>
        <th>Price - Kira</th>
        <th>Kira match</th>
        <th>Provider code</th>
      </tr>
    </thead>
    <tbody>$($body -join "`n")</tbody>
  </table>
</section>
"@
}

$totalPackages = ($data | ForEach-Object { @($_.packages).Count } | Measure-Object -Sum).Sum
$totalKira = ($data | ForEach-Object { @($_.packages | Where-Object { $null -ne $_.kiraPriceUsd }).Count } | Measure-Object -Sum).Sum
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

$html = @"
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>FinchUP Live Package Prices With Kira</title>
  <style>
    @page { size: A4 landscape; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 8px; line-height: 1.25; }
    header { border-bottom: 2px solid #111827; margin-bottom: 8px; padding-bottom: 7px; }
    h1 { font-size: 19px; margin: 0 0 4px; }
    h2 { font-size: 12px; margin: 0 0 2px; }
    p { margin: 0; color: #4b5563; }
    .meta { color: #4b5563; font-size: 8px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0 9px; }
    .card { border: 1px solid #d1d5db; border-radius: 6px; padding: 6px; }
    .card strong { display: block; font-size: 12px; color: #111827; }
    section { margin: 0 0 11px; page-break-inside: avoid; }
    .section-head { border-bottom: 1px solid #d1d5db; margin-bottom: 4px; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 2px 3px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; font-size: 7.5px; }
    tr:nth-child(even) td { background: #fafafa; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; }
    .ok { color: #047857; }
    .thin { color: #b45309; font-weight: 700; }
    .loss, .down { color: #b91c1c; font-weight: 700; }
    .up { color: #047857; font-weight: 700; }
    .same, .empty { color: #6b7280; }
    .note { background: #fff8df; border: 1px solid #e4cf80; margin-bottom: 9px; padding: 6px 8px; }
  </style>
</head>
<body>
  <header>
    <h1>FinchUP Live Package Prices With Kira Comparison</h1>
    <div class="meta">Generated: $(HtmlEncode $generatedAt) | Source: live FinchUP MongoDB + saved Kira comparison CSV</div>
  </header>
  <div class="summary">
    <div class="card"><strong>$($data.Count)</strong>Active games</div>
    <div class="card"><strong>$totalPackages</strong>Active packages</div>
    <div class="card"><strong>$totalKira</strong>Kira matches</div>
    <div class="card"><strong>freefire_sgmy</strong>Free Fire provider code</div>
  </div>
  <div class="note">Fee = FinchUP price minus supplier cost. Kira fee = Kira price minus supplier cost. Price - Kira shows how far current FinchUP price is above or below Kira.</div>
  $($sections -join "`n")
</body>
</html>
"@

Set-Content -LiteralPath $htmlPath -Value $html -Encoding UTF8

$chromeCandidates = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
)

$chrome = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) {
    throw "No Chrome or Edge executable found for PDF generation."
}

$htmlUri = (New-Object System.Uri($htmlPath)).AbsoluteUri
& $chrome --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="$pdfPath" $htmlUri | Out-Null

if (-not (Test-Path $pdfPath)) {
    throw "PDF generation failed: $pdfPath was not created."
}

[PSCustomObject]@{
    Csv = $csvPath
    Html = $htmlPath
    Pdf = $pdfPath
}
