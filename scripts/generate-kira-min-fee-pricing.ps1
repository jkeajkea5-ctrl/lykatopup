param(
    [string]$CsvPath = "docs\four-game-price-comparison.csv",
    [string]$OutputDir = "reports",
    [decimal]$MinimumFee = 0.12
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$csvFullPath = Join-Path $root $CsvPath
$outDirPath = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outDirPath | Out-Null

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$outCsvPath = Join-Path $outDirPath "kira-min-fee-pricing-mlbb-hok-pubg-$dateStamp.csv"
$htmlPath = Join-Path $outDirPath "kira-min-fee-pricing-mlbb-hok-pubg-$dateStamp.html"
$pdfPath = Join-Path $outDirPath "kira-min-fee-pricing-mlbb-hok-pubg-$dateStamp.pdf"

function HtmlEncode([object]$value) {
    return [System.Net.WebUtility]::HtmlEncode([string]$value)
}

function Money([object]$value) {
    if ($null -eq $value -or [string]::IsNullOrWhiteSpace([string]$value)) {
        return "-"
    }
    return "$" + ([decimal]$value).ToString("0.00")
}

function PriceClass([decimal]$oldPrice, [decimal]$newPrice) {
    if ($newPrice -lt $oldPrice) { return "down" }
    if ($newPrice -gt $oldPrice) { return "up" }
    return "same"
}

$games = @("Mobile Legends", "Honor of Kings", "PUBG Mobile")
$sourceRows = Import-Csv -LiteralPath $csvFullPath |
    Where-Object { $_.Game -in $games }

$rows = foreach ($row in $sourceRows) {
    $cost = [decimal]$row."G2Bulk Price USD"
    $currentPrice = [decimal]$row."Our Price USD"
    $kiraPrice = if ([string]::IsNullOrWhiteSpace($row."Kira Price USD")) { $null } else { [decimal]$row."Kira Price USD" }

    if ($null -ne $kiraPrice) {
        $recommendedPrice = [Math]::Max($kiraPrice, $cost + $MinimumFee)
        $basis = if ($recommendedPrice -gt $kiraPrice) { "Kira + min fee adjustment" } else { "Kira" }
    } else {
        $recommendedPrice = $currentPrice
        $basis = "No Kira match - keep current"
    }

    $recommendedPrice = [Math]::Round($recommendedPrice, 2)
    $recommendedFee = [Math]::Round($recommendedPrice - $cost, 2)

    [PSCustomObject]@{
        Game = $row.Game
        Package = $row.Package
        Category = $row.Category
        "G2Bulk Cost USD" = $cost.ToString("0.00")
        "Current Price USD" = $currentPrice.ToString("0.00")
        "Kira Price USD" = if ($null -eq $kiraPrice) { "" } else { $kiraPrice.ToString("0.00") }
        "Recommended Price USD" = $recommendedPrice.ToString("0.00")
        "Recommended Fee USD" = $recommendedFee.ToString("0.00")
        "Change USD" = ($recommendedPrice - $currentPrice).ToString("0.00")
        Basis = $basis
        "Kira Match" = $row."Kira Match"
        "Kira URL" = $row."Kira URL"
    }
}

$rows | Export-Csv -LiteralPath $outCsvPath -NoTypeInformation -Encoding UTF8

$sections = foreach ($game in $games) {
    $gameRows = @($rows | Where-Object { $_.Game -eq $game })
    $matched = @($gameRows | Where-Object { -not [string]::IsNullOrWhiteSpace($_."Kira Price USD") })
    $adjusted = @($gameRows | Where-Object { $_.Basis -eq "Kira + min fee adjustment" })
    $totalCost = ($matched | ForEach-Object { [decimal]$_."G2Bulk Cost USD" } | Measure-Object -Sum).Sum
    $totalRevenue = ($matched | ForEach-Object { [decimal]$_."Recommended Price USD" } | Measure-Object -Sum).Sum
    $totalFee = ($matched | ForEach-Object { [decimal]$_."Recommended Fee USD" } | Measure-Object -Sum).Sum

    $body = foreach ($item in $gameRows) {
        $changeClass = PriceClass ([decimal]$item."Current Price USD") ([decimal]$item."Recommended Price USD")
        @"
<tr>
  <td>$(HtmlEncode $item.Package)</td>
  <td>$(HtmlEncode $item.Category)</td>
  <td class="num">$(Money $item."G2Bulk Cost USD")</td>
  <td class="num">$(Money $item."Current Price USD")</td>
  <td class="num">$(Money $item."Kira Price USD")</td>
  <td class="num strong">$(Money $item."Recommended Price USD")</td>
  <td class="num">$(Money $item."Recommended Fee USD")</td>
  <td class="num $changeClass">$(Money $item."Change USD")</td>
  <td>$(HtmlEncode $item.Basis)</td>
</tr>
"@
    }

    @"
<section>
  <div class="section-head">
    <h2>$(HtmlEncode $game)</h2>
    <p>Matched Kira packages: $($matched.Count) / $($gameRows.Count) | Min-fee adjusted: $($adjusted.Count) | Matched revenue: $(Money $totalRevenue) | Matched fee: $(Money $totalFee)</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>Package</th>
        <th>Category</th>
        <th>G2Bulk cost</th>
        <th>Current price</th>
        <th>Kira price</th>
        <th>Recommended price</th>
        <th>Fee</th>
        <th>Change</th>
        <th>Basis</th>
      </tr>
    </thead>
    <tbody>$($body -join "`n")</tbody>
  </table>
</section>
"@
}

$matchedAll = @($rows | Where-Object { -not [string]::IsNullOrWhiteSpace($_."Kira Price USD") })
$adjustedAll = @($rows | Where-Object { $_.Basis -eq "Kira + min fee adjustment" })
$totalRevenueAll = ($matchedAll | ForEach-Object { [decimal]$_."Recommended Price USD" } | Measure-Object -Sum).Sum
$totalFeeAll = ($matchedAll | ForEach-Object { [decimal]$_."Recommended Fee USD" } | Measure-Object -Sum).Sum
$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"

$html = @"
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>Kira Minimum Fee Pricing</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 9px; line-height: 1.3; }
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
    th { background: #f3f4f6; text-align: left; font-size: 8px; }
    tr:nth-child(even) td { background: #fafafa; }
    .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; }
    .down { color: #b91c1c; }
    .up { color: #047857; }
    .same { color: #6b7280; }
    .note { background: #fff8df; border: 1px solid #e4cf80; margin-bottom: 10px; padding: 7px 9px; }
  </style>
</head>
<body>
  <header>
    <h1>MLBB, HOK, PUBG Pricing: Follow Kira With Minimum Fee</h1>
    <div class="meta">Generated: $(HtmlEncode $generatedAt) | Rule: recommended price = max(Kira price, G2Bulk cost + $(Money $MinimumFee)); no Kira match keeps current price.</div>
  </header>
  <div class="summary">
    <div class="card"><strong>$($rows.Count)</strong>Total packages</div>
    <div class="card"><strong>$($matchedAll.Count)</strong>Matched Kira packages</div>
    <div class="card"><strong>$($adjustedAll.Count)</strong>Adjusted to min fee</div>
    <div class="card"><strong>$(Money $totalRevenueAll)</strong>Matched revenue</div>
    <div class="card"><strong>$(Money $totalFeeAll)</strong>Matched total fee</div>
  </div>
  <div class="note">Packages without a verified Kira match are left at current FinchUP price. Recommended fee is supplier cost subtracted from recommended price.</div>
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
    Csv = $outCsvPath
    Html = $htmlPath
    Pdf = $pdfPath
}
