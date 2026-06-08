param(
    [string]$CsvPath = "docs\four-game-price-comparison.csv",
    [string]$OutputDir = "reports"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$csvFullPath = Join-Path $root $CsvPath
$outDirPath = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outDirPath | Out-Null

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$htmlPath = Join-Path $outDirPath "mlbb-pubgm-kira-price-comparison-$dateStamp.html"
$pdfPath = Join-Path $outDirPath "mlbb-pubgm-kira-price-comparison-$dateStamp.pdf"

function HtmlEncode([object]$value) {
    return [System.Net.WebUtility]::HtmlEncode([string]$value)
}

function Money([object]$value) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) {
        return "-"
    }
    return "$" + ([decimal]$value).ToString("0.00")
}

function StatusClass([object]$value) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) {
        return "empty"
    }
    $number = [decimal]$value
    if ($number -lt 0) { return "loss" }
    if ($number -lt 0.15) { return "thin" }
    return "ok"
}

$allRows = Import-Csv -LiteralPath $csvFullPath |
    Where-Object { $_.Game -in @("Mobile Legends", "PUBG Mobile") }

$sections = foreach ($game in @("Mobile Legends", "PUBG Mobile")) {
    $rows = @($allRows | Where-Object { $_.Game -eq $game })
    $matched = @($rows | Where-Object { -not [string]::IsNullOrWhiteSpace($_."Kira Price USD") })
    $totalCost = ($matched | Measure-Object -Property "G2Bulk Price USD" -Sum).Sum
    $totalRevenue = ($matched | Measure-Object -Property "Kira Price USD" -Sum).Sum
    $totalProfit = ($matched | Measure-Object -Property "Kira - G2Bulk USD" -Sum).Sum

    $body = foreach ($row in $rows) {
        $profitClass = StatusClass $row."Kira - G2Bulk USD"
        @"
<tr>
  <td>$(HtmlEncode $row.Package)</td>
  <td>$(HtmlEncode $row."G2Bulk Catalogue")</td>
  <td>$(HtmlEncode $row.Category)</td>
  <td class="num">$(Money $row."G2Bulk Price USD")</td>
  <td class="num">$(Money $row."Our Price USD")</td>
  <td class="num">$(Money $row."Our Fee USD")</td>
  <td class="num">$(Money $row."Kira Price USD")</td>
  <td class="num $profitClass">$(Money $row."Kira - G2Bulk USD")</td>
  <td>$(HtmlEncode $row."Kira Match")</td>
</tr>
"@
    }

    @"
<section>
  <div class="section-head">
    <div>
      <h2>$(HtmlEncode $game)</h2>
      <p>Matched Kira packages: $($matched.Count) / $($rows.Count) | Cost: $(Money $totalCost) | Kira revenue: $(Money $totalRevenue) | Profit: $(Money $totalProfit)</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Package</th>
        <th>G2Bulk item</th>
        <th>Category</th>
        <th>G2Bulk cost</th>
        <th>Our price</th>
        <th>Our fee</th>
        <th>Kira price</th>
        <th>Kira profit</th>
        <th>Kira match</th>
      </tr>
    </thead>
    <tbody>
      $($body -join "`n")
    </tbody>
  </table>
</section>
"@
}

$matchedAll = @($allRows | Where-Object { -not [string]::IsNullOrWhiteSpace($_."Kira Price USD") })
$totalCostAll = ($matchedAll | Measure-Object -Property "G2Bulk Price USD" -Sum).Sum
$totalRevenueAll = ($matchedAll | Measure-Object -Property "Kira Price USD" -Sum).Sum
$totalProfitAll = ($matchedAll | Measure-Object -Property "Kira - G2Bulk USD" -Sum).Sum
$thinAll = @($matchedAll | Where-Object { [decimal]$_."Kira - G2Bulk USD" -ge 0 -and [decimal]$_."Kira - G2Bulk USD" -lt 0.15 }).Count
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

$html = @"
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>MLBB and PUBG Kira Price Comparison</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 9.5px; line-height: 1.3; }
    header { border-bottom: 2px solid #111827; margin-bottom: 10px; padding-bottom: 8px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 0 0 2px; }
    p { margin: 0; color: #4b5563; }
    .meta { color: #4b5563; font-size: 9px; }
    .summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin: 10px 0 12px; }
    .card { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px; }
    .card strong { display: block; font-size: 13px; color: #111827; }
    section { margin: 0 0 14px; page-break-inside: avoid; }
    .section-head { border-bottom: 1px solid #d1d5db; margin-bottom: 5px; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #d1d5db; padding: 3px 4px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; font-size: 8.5px; }
    tr:nth-child(even) td { background: #fafafa; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .ok { color: #047857; }
    .thin { color: #b45309; font-weight: 700; }
    .loss { color: #b91c1c; font-weight: 700; }
    .empty { color: #9ca3af; }
    .note { background: #fff8df; border: 1px solid #e4cf80; margin-bottom: 10px; padding: 7px 9px; }
  </style>
</head>
<body>
  <header>
    <h1>MLBB and PUBG Mobile: Our Price vs Kira</h1>
    <div class="meta">Generated: $(HtmlEncode $generatedAt) | Cost basis: G2Bulk supplier cost from existing FinchUP comparison CSV</div>
  </header>
  <div class="summary">
    <div class="card"><strong>$($allRows.Count)</strong>Total packages</div>
    <div class="card"><strong>$($matchedAll.Count)</strong>Matched Kira packages</div>
    <div class="card"><strong>$(Money $totalCostAll)</strong>G2Bulk cost</div>
    <div class="card"><strong>$(Money $totalRevenueAll)</strong>Kira revenue</div>
    <div class="card"><strong>$(Money $totalProfitAll)</strong>Profit if following Kira</div>
  </div>
  <div class="note">Thin margin items under $0.15 profit: $thinAll. Blank Kira cells mean no verified Kira match in the saved comparison data.</div>
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
    Html = $htmlPath
    Pdf = $pdfPath
}
