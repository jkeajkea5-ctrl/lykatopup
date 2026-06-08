param(
    [string]$OutputDir = "reports"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDirPath = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outDirPath | Out-Null

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$jsonPath = Join-Path $outDirPath "finchup-live-package-prices-$dateStamp.json"
$csvPath = Join-Path $outDirPath "finchup-live-package-prices-$dateStamp.csv"
$htmlPath = Join-Path $outDirPath "finchup-live-package-prices-$dateStamp.html"
$pdfPath = Join-Path $outDirPath "finchup-live-package-prices-$dateStamp.pdf"

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

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
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
    packages: packages.map((pkg) => ({
      name: pkg.amountLabel || pkg.name,
      category: pkg.packageCategory || '',
      priceUsd: Number(pkg.priceUsd || 0),
      supplierCostUsd: pkg.supplierCostUsd === undefined || pkg.supplierCostUsd === null ? null : Number(pkg.supplierCostUsd),
      feeUsd: pkg.supplierCostUsd === undefined || pkg.supplierCostUsd === null ? null : Number(pkg.priceUsd || 0) - Number(pkg.supplierCostUsd || 0),
      provider: pkg.deliveryProvider || '',
      providerGameCode: pkg.providerGameCode || '',
      providerCatalogueName: pkg.providerCatalogueName || ''
    }))
  });
}

fs.writeFileSync(outJson, JSON.stringify(output, null, 2), 'utf8');

const lines = [
  ['Game', 'Slug', 'Package', 'Category', 'Price USD', 'Supplier Cost USD', 'Fee USD', 'Provider', 'Provider Game Code', 'Provider Catalogue'].join(',')
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
      pkg.provider,
      pkg.providerGameCode,
      pkg.providerCatalogueName
    ].map(csvEscape).join(','));
  }
}
fs.writeFileSync(outCsv, lines.join('\n'), 'utf8');
await mongoose.disconnect();
'@

    $nodeScript | node --input-type=module - $jsonPath $csvPath
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

function FeeClass([object]$value) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) { return "empty" }
    $number = [decimal]$value
    if ($number -lt 0) { return "loss" }
    if ($number -lt 0.12) { return "thin" }
    return "ok"
}

$data = Get-Content -LiteralPath $jsonPath -Raw | ConvertFrom-Json
$sections = foreach ($section in $data) {
    $packageRows = @($section.packages)
    $body = foreach ($pkg in $packageRows) {
        $feeClass = FeeClass $pkg.feeUsd
        @"
<tr>
  <td>$(HtmlEncode $pkg.name)</td>
  <td>$(HtmlEncode $pkg.category)</td>
  <td class="num strong">$(Money $pkg.priceUsd 2)</td>
  <td class="num">$(Money $pkg.supplierCostUsd 3)</td>
  <td class="num $feeClass">$(Money $pkg.feeUsd 3)</td>
  <td>$(HtmlEncode $pkg.providerGameCode)</td>
  <td>$(HtmlEncode $pkg.providerCatalogueName)</td>
</tr>
"@
    }

    @"
<section>
  <div class="section-head">
    <h2>$(HtmlEncode $section.game.name)</h2>
    <p>Slug: $(HtmlEncode $section.game.slug) | Packages: $($packageRows.Count) | Currency: $(HtmlEncode $section.game.currencyLabel)</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Package</th>
        <th>Category</th>
        <th>Price</th>
        <th>Supplier cost</th>
        <th>Fee</th>
        <th>Provider code</th>
        <th>Provider item</th>
      </tr>
    </thead>
    <tbody>$($body -join "`n")</tbody>
  </table>
</section>
"@
}

$totalPackages = ($data | ForEach-Object { @($_.packages).Count } | Measure-Object -Sum).Sum
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

$html = @"
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>FinchUP Live Package Prices</title>
  <style>
    @page { size: A4 landscape; margin: 9mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 8.5px; line-height: 1.28; }
    header { border-bottom: 2px solid #111827; margin-bottom: 9px; padding-bottom: 8px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 13px; margin: 0 0 2px; }
    p { margin: 0; color: #4b5563; }
    .meta { color: #4b5563; font-size: 8.5px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 9px 0 10px; }
    .card { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px; }
    .card strong { display: block; font-size: 13px; color: #111827; }
    section { margin: 0 0 12px; page-break-inside: avoid; }
    .section-head { border-bottom: 1px solid #d1d5db; margin-bottom: 5px; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 3px 4px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; font-size: 8px; }
    tr:nth-child(even) td { background: #fafafa; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; }
    .ok { color: #047857; }
    .thin { color: #b45309; font-weight: 700; }
    .loss { color: #b91c1c; font-weight: 700; }
    .empty { color: #9ca3af; }
    .note { background: #fff8df; border: 1px solid #e4cf80; margin-bottom: 10px; padding: 7px 9px; }
  </style>
</head>
<body>
  <header>
    <h1>FinchUP Live Package Prices</h1>
    <div class="meta">Generated: $(HtmlEncode $generatedAt) | Source: live FinchUP MongoDB active packages</div>
  </header>
  <div class="summary">
    <div class="card"><strong>$($data.Count)</strong>Active games</div>
    <div class="card"><strong>$totalPackages</strong>Active packages</div>
    <div class="card"><strong>freefire_sgmy</strong>Free Fire provider code</div>
  </div>
  <div class="note">This report reflects the live database after Free Fire MYSG sync and MLBB/HOK/PUBG Kira-min-fee pricing updates.</div>
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
