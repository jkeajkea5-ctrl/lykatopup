param(
    [string]$OutputDir = "reports"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$outDirPath = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outDirPath | Out-Null

$dateStamp = Get-Date -Format "yyyy-MM-dd"
$htmlPath = Join-Path $outDirPath "g2bulk-mysg-price-list-$dateStamp.html"
$pdfPath = Join-Path $outDirPath "g2bulk-mysg-price-list-$dateStamp.pdf"

$games = @(
    @{ Code = "mlbb"; Title = "Mobile Legends (MLBB)" },
    @{ Code = "pubgm"; Title = "PUBG Mobile (PUBGM)" },
    @{ Code = "hok"; Title = "Honor of Kings (HOK)" },
    @{ Code = "freefire_sgmy"; Title = "Free Fire MYSG" }
)

function HtmlEncode([object]$value) {
    return [System.Net.WebUtility]::HtmlEncode([string]$value)
}

function FormatAmount([object]$value) {
    return ([decimal]$value).ToString("0.000")
}

$sections = New-Object System.Collections.Generic.List[string]

foreach ($game in $games) {
    $url = "https://api.g2bulk.com/v1/games/$($game.Code)/catalogue"
    $response = Invoke-RestMethod -Uri $url -Method Get

    $rows = foreach ($item in $response.catalogues) {
        "<tr><td>$(HtmlEncode $item.name)</td><td class='amount'>$(FormatAmount $item.amount)</td></tr>"
    }

    $sections.Add(@"
<section>
  <div class="section-head">
    <h2>$(HtmlEncode $game.Title)</h2>
    <span>Code: $(HtmlEncode $game.Code)</span>
  </div>
  <table>
    <thead>
      <tr><th>Package</th><th>Price</th></tr>
    </thead>
    <tbody>
      $($rows -join "`n")
    </tbody>
  </table>
</section>
"@)
}

$generatedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss zzz"
$html = @"
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>G2Bulk MYSG Price List</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm;
    }
    * {
      box-sizing: border-box;
    }
    body {
      margin: 0;
      color: #172026;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10.5px;
      line-height: 1.35;
    }
    header {
      border-bottom: 2px solid #172026;
      margin-bottom: 14px;
      padding-bottom: 10px;
    }
    h1 {
      margin: 0 0 5px;
      font-size: 22px;
      letter-spacing: 0;
    }
    .meta {
      color: #465761;
      font-size: 10px;
    }
    section {
      break-inside: avoid;
      margin: 0 0 18px;
    }
    .section-head {
      align-items: baseline;
      border-bottom: 1px solid #b7c2c8;
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      padding-bottom: 4px;
    }
    h2 {
      font-size: 15px;
      margin: 0;
    }
    .section-head span {
      color: #5d6b73;
      font-size: 9.5px;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th,
    td {
      border: 1px solid #d3dce0;
      padding: 4px 6px;
      vertical-align: top;
    }
    th {
      background: #edf3f6;
      color: #172026;
      font-size: 10px;
      text-align: left;
    }
    tr:nth-child(even) td {
      background: #f8fafb;
    }
    .amount {
      font-variant-numeric: tabular-nums;
      text-align: right;
      white-space: nowrap;
      width: 76px;
    }
    .note {
      background: #fff8df;
      border: 1px solid #e4cf80;
      margin: 0 0 14px;
      padding: 8px 10px;
    }
  </style>
</head>
<body>
  <header>
    <h1>G2Bulk MYSG Price List</h1>
    <div class="meta">Generated: $(HtmlEncode $generatedAt) | Source: https://api.g2bulk.com/v1/games/:code/catalogue</div>
  </header>
  <div class="note">Prices are live G2Bulk API amount values at generation time and may change before ordering.</div>
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
