param(
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $ProjectRoot

function Assert-FileExists {
  param([string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Missing required file: $Path"
  }
}

function Test-PowerShellSyntax {
  param([string[]]$Files)

  foreach ($file in $Files) {
    $tokens = $null
    $errors = $null
    [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $file).Path, [ref]$tokens, [ref]$errors) | Out-Null
    if ($errors.Count -gt 0) {
      $messages = ($errors | ForEach-Object { $_.Message }) -join "; "
      throw "PowerShell syntax failed for $file`: $messages"
    }
  }
}

function Test-TextContains {
  param(
    [string]$Path,
    [string]$Pattern
  )

  $content = Get-Content -LiteralPath $Path -Raw
  if ($content -notmatch [regex]::Escape($Pattern)) {
    throw "Expected '$Path' to contain '$Pattern'"
  }
}

function Test-TextDoesNotContain {
  param(
    [string]$Path,
    [string]$Pattern
  )

  $content = Get-Content -LiteralPath $Path -Raw
  if ($content -match [regex]::Escape($Pattern)) {
    throw "Expected '$Path' not to contain '$Pattern'"
  }
}

function Invoke-NodeSmoke {
  param(
    [string]$Name,
    [string]$Script,
    [string[]]$Arguments = @()
  )

  $tempScript = Join-Path $ProjectRoot (".mypc-node-smoke-" + [System.Guid]::NewGuid().ToString("N") + ".mjs")
  Set-Content -LiteralPath $tempScript -Encoding UTF8 -Value $Script
  try {
    node $tempScript @Arguments
    if ($LASTEXITCODE -ne 0) {
      throw "$Name failed with exit code $LASTEXITCODE"
    }
  } finally {
    Remove-Item -LiteralPath $tempScript -Force -ErrorAction SilentlyContinue
  }
}

if (-not $SkipBuild) {
  npm run build
}

Assert-FileExists "public\assets\fonts\Rubik-Variable.ttf"
Assert-FileExists "tools\SumatraPDF\SumatraPDF.exe"
Assert-FileExists "docs\QA-1.0.19.md"
Assert-FileExists "docs\QA-1.0.20.md"
Assert-FileExists "docs\QA-1.0.21.md"
Assert-FileExists "docs\QA-1.0.22.md"
Assert-FileExists "docs\QA-1.0.23.md"
Assert-FileExists "docs\QA-1.0.24.md"
Assert-FileExists "docs\QA-1.0.25.md"
Assert-FileExists "docs\QA-1.0.26.md"
Assert-FileExists "docs\QA-1.0.27.md"
Assert-FileExists "docs\QA-1.0.28.md"
Assert-FileExists "docs\QA-1.0.29.md"
Assert-FileExists "docs\QA-1.0.30.md"
Assert-FileExists "docs\QA-1.0.31.md"
Assert-FileExists "docs\QA-1.0.32.md"
Assert-FileExists "docs\QA-1.0.33.md"
Assert-FileExists "docs\QA-1.0.34.md"
Assert-FileExists "docs\QA-1.0.35.md"
Assert-FileExists "docs\QA-1.0.36.md"
Assert-FileExists "docs\QA-1.0.37.md"
Assert-FileExists "docs\QA-1.0.38.md"
Assert-FileExists "docs\QA-1.0.39.md"
Assert-FileExists "docs\QA-1.0.40.md"
Assert-FileExists "docs\QA-1.0.41.md"
Assert-FileExists "docs\QA-1.0.42.md"
Assert-FileExists "docs\QA-1.0.43.md"
Assert-FileExists "docs\QA-1.0.44.md"
Assert-FileExists "docs\QA-1.0.45.md"
Assert-FileExists "docs\QA-1.0.46.md"
Assert-FileExists "docs\QA-1.0.47.md"
Assert-FileExists "docs\QA-1.0.48.md"
Assert-FileExists "docs\QA-1.0.49.md"
Assert-FileExists "docs\QA-1.0.50.md"
Assert-FileExists "docs\QA-1.0.51.md"
Assert-FileExists "docs\QA-1.0.52.md"
Assert-FileExists "docs\QA-1.0.53.md"
Assert-FileExists "docs\QA-1.0.54.md"
Assert-FileExists "docs\QA-1.0.55.md"
Assert-FileExists "docs\QA-CUSTOMER-ISSUES-MATRIX.md"
Assert-FileExists "docs\CUSTOMER-QA-RUNBOOK.md"
Assert-FileExists "tests\fixtures\encrypted-password-312830714.pdf"

Test-PowerShellSyntax @(
  "scripts\print-pdf-profile.ps1",
  "scripts\print-pdf.ps1",
  "scripts\print-image.ps1",
  "scripts\print-word.ps1",
  "scripts\print-excel.ps1",
  "scripts\print-powerpoint.ps1",
  "scripts\count-pages.ps1",
  "scripts\start-windows.ps1",
  "scripts\install-windows.ps1",
  "scripts\update-windows.ps1",
  "scripts\customer-qa.ps1"
)

Test-TextContains "public\index.html" "/styles.css?v="
Test-TextContains "public\index.html" "/app.js?v="
Test-TextContains "public\index.html" 'lang="he" dir="rtl"'
Test-TextContains "public\index.html" 'aria-live="polite"'
Test-TextContains "public\index.html" 'alt="MY-PC"'
Test-TextContains "public\index.html" 'data-lucide='
Test-TextContains "public\styles.css" "Rubik-Variable.ttf"
Test-TextContains "public\styles.css" "font-display: swap"
Test-TextContains "public\styles.css" ":focus-visible"
Test-TextContains "public\styles.css" "prefers-reduced-motion"
Test-TextContains "public\styles.css" "overflow-x: hidden"
Test-TextContains "public\styles.css" "@media (max-width:"
Test-TextContains "public\styles.css" "@media (max-width: 620px)"
Test-TextContains "public\styles.css" "cursor: pointer"
Test-TextContains "public\styles.css" "table-layout: fixed"
Test-TextContains "public\styles.css" ".printer-profile-tabs"
Test-TextContains "public\styles.css" ".ops-jobs-table"
Test-TextContains "public\app.js" "document.documentElement.dir"
Test-TextContains "public\app.js" "if (window.lucide) window.lucide.createIcons()"
Test-TextContains "public\app.js" "function setOptionalText"
Test-TextContains "public\app.js" "if (element) element.textContent"
Test-TextContains "public\app.js" "renderPrinterProfileCards"
Test-TextContains "public\app.js" "data-printer-profile-tab"
Test-TextContains "public\app.js" "escapeHtml"
Test-TextContains "public\app.js" "const APP_VERSION"
Test-TextContains "public\app.js" "updateViaCache: `"none`""
Test-TextContains "public\app.js" "ensureFreshAppVersion"
Test-TextContains "public\app.js" "/api/diagnostics/print-engines"
Test-TextContains "public\app.js" "downloadCustomerQaReport"
Test-TextContains "public\app.js" "my-pc-whatsapp-print-customer-qa"
Test-TextContains "public\app.js" "MINIMUM_DIAGNOSTICS_VERSION"
Test-TextContains "public\app.js" "serverVersion"
Test-TextContains "public\app.js" "minimumDiagnosticsVersion"
Test-TextContains "public\app.js" "recommendedVersion"
Test-TextContains "public\styles.css" ".engine-status-grid"
Test-TextContains "src\adminServer.ts" "/api/diagnostics/print-engines"
Test-TextContains "src\printEngines.ts" "PDF compatibility mode will fall back to SumatraPDF"
Test-TextContains "public\sw.js" "event.request.mode === `"navigate`""
Test-TextDoesNotContain "public\sw.js" '"/",'
Test-TextContains "package.json" "pdfjs-dist"
Test-TextContains "package.json" ">=22.13.0"
Test-TextContains "scripts\print-pdf-profile.ps1" "-pwd"
Test-TextContains "scripts\print-pdf-profile.ps1" "-sPDFPassword"
Test-TextContains "scripts\print-pdf-profile.ps1" "DryRun"
Test-TextContains "scripts\print-pdf-profile.ps1" "tools\Ghostscript"
Test-TextContains "scripts\print-image.ps1" "DryRun"
Test-TextContains "scripts\print-text.ps1" "DryRun"
Test-TextContains "scripts\print-word.ps1" "DryRun"
Test-TextContains "scripts\print-word.ps1" '$document.PrintOut($false)'
Test-TextContains "scripts\print-word.ps1" "ReleaseComObject"
Test-TextContains "scripts\print-excel.ps1" "DryRun"
Test-TextContains "scripts\print-excel.ps1" "ReleaseComObject"
Test-TextContains "scripts\print-powerpoint.ps1" "DryRun"
Test-TextContains "scripts\print-powerpoint.ps1" "ReleaseComObject"
Test-TextContains "scripts\print-pdf-profile.ps1" "Ghostscript compatibility render/print failed, trying SumatraPDF"
Test-TextContains "scripts\print-pdf-profile.ps1" "ProcessStartInfo"
Test-TextContains "scripts\install-windows.ps1" "Initialize-Ghostscript"
Test-TextContains "scripts\install-windows.ps1" "gs10071w64.exe"
Test-TextContains "scripts\install-windows.ps1" 'Get-Command "gswin64c.exe"'
Test-TextContains "scripts\install-windows.ps1" "C:\Program Files\gs\*\bin\gswin64c.exe"
Test-TextContains "scripts\install-windows.ps1" "my-pc-ghostscript-"
Test-TextContains "scripts\install-windows.ps1" "PDF compatibility mode will fall back to SumatraPDF"
Test-TextContains "scripts\update-windows.ps1" "Initialize-Ghostscript"
Test-TextContains "scripts\update-windows.ps1" 'Get-Command "gswin64c.exe"'
Test-TextContains "scripts\update-windows.ps1" "C:\Program Files\gs\*\bin\gswin64c.exe"
Test-TextContains "scripts\update-windows.ps1" "my-pc-ghostscript-"
Test-TextContains "scripts\update-windows.ps1" "PDF compatibility mode will fall back to SumatraPDF"
Test-TextContains "scripts\start-windows.ps1" "Initialize-Ghostscript"
Test-TextContains "scripts\start-windows.ps1" 'Get-Command "gswin64c.exe"'
Test-TextContains "scripts\start-windows.ps1" "C:\Program Files\gs\*\bin\gswin64c.exe"
Test-TextContains "scripts\start-windows.ps1" "my-pc-ghostscript-"
Test-TextContains "scripts\start-windows.ps1" "PDF compatibility mode will fall back to SumatraPDF"
Test-TextContains "scripts\start-windows.ps1" "Stop-StaleProjectServer"
Test-TextContains "scripts\start-windows.ps1" "Get-RunningServerStatus"
Test-TextContains "scripts\start-windows.ps1" "Test-RunningServerDiagnostics"
Test-TextContains "scripts\start-windows.ps1" "/api/diagnostics/print-engines"
Test-TextContains "scripts\start-windows.ps1" "Stop-ProjectServerProcesses"
Test-TextContains "scripts\start-windows.ps1" "diagnostics are missing"
Test-TextContains "scripts\start-windows.ps1" '.Replace("/", "\")'
Test-TextContains "scripts\start-windows.ps1" "Get-NetTCPConnection"
Test-TextContains "scripts\start-windows.ps1" "already in use by another process"
Test-TextContains "src\maintenance.ts" "scripts\\start-windows.ps1"
Test-TextContains "src\maintenance.ts" "'-Hidden'"
Test-TextContains "src\jobProcessor.ts" "copyFileSync(sourcePath, destinationPath)"
Test-TextContains "src\jobProcessor.ts" "Trial mode allows PDF/JPG/JPEG/PNG only"
Test-TextContains "src\printQueue.ts" "FromBase64String"
Test-TextContains "src\printQueue.ts" "buildStopPrintQueueCommand"
Test-TextContains "src\main.ts" "EADDRINUSE"
Test-TextContains "src\db.ts" "moveInterruptedJobFile"
Test-TextContains "src\db.ts" "copyFileSync(sourcePath, destinationPath)"
Test-TextContains "src\db.ts" "isRetryableFileError"
Test-TextContains "src\version.ts" "APP_VERSION"
Test-TextContains "src\maintenance.ts" "return APP_VERSION"
Test-TextContains "src\alerts.ts" "return APP_VERSION"
Test-TextContains "src\alerts.ts" "972522250223"
Test-TextContains "src\alerts.ts" "App version"
Test-TextContains "src\errorDetails.ts" "cmd"
Test-TextContains "src\errorDetails.ts" "stdout"
Test-TextContains "src\errorDetails.ts" "stderr"
Test-TextContains "src\errorDetails.ts" "Technical details"
Test-TextContains "src\printOrders.ts" "this.orders.delete(order.phone)"
Test-TextContains "src\printOrders.ts" "Customer message skipped because WhatsApp is disconnected"
Test-TextContains "src\printOrders.ts" "sendFailureWarningThrottleMs"
Test-TextContains "scripts\customer-qa.ps1" "/api/diagnostics/print-engines"
Test-TextContains "scripts\customer-qa.ps1" "customer-qa-"
Test-TextContains "scripts\customer-qa.ps1" "MinimumDiagnosticsVersion"
Test-TextContains "scripts\customer-qa.ps1" "serverVersion"
Test-TextContains "scripts\customer-qa.ps1" "selectedPrinter"
Test-TextContains "scripts\customer-qa.ps1" "fieldValidationChecklist"
Test-TextContains "scripts\customer-qa.ps1" "Invoke-Text"
Test-TextContains "scripts\customer-qa.ps1" "frontend"
Test-TextContains "scripts\customer-qa.ps1" '/app.js?v='
Test-TextContains "scripts\customer-qa.ps1" '/styles.css?v='
Test-TextContains "docs\CUSTOMER-QA-RUNBOOK.md" "It does not print a test page"
Test-TextContains "docs\CUSTOMER-QA-RUNBOOK.md" '`serverVersion` failed'
Test-TextContains "docs\CUSTOMER-QA-RUNBOOK.md" "Required Physical Confirmation"

$uiStaticSmoke = @'
const fs = await import('node:fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
const cacheVersion = version.replaceAll('.', '-');
const index = fs.readFileSync('public/index.html', 'utf8');
const app = fs.readFileSync('public/app.js', 'utf8');
const css = fs.readFileSync('public/styles.css', 'utf8');
const sw = fs.readFileSync('public/sw.js', 'utf8');

const expectations = [
  [index.includes('<html lang="he" dir="rtl">'), 'index html must start in Hebrew RTL'],
  [index.includes('/styles.css?v=' + version), 'stylesheet cache version must match package version'],
  [index.includes('/app.js?v=' + version), 'app cache version must match package version'],
  [app.includes('register(`/sw.js?v=${APP_VERSION}`'), 'service worker registration must use runtime app version'],
  [app.includes('const APP_VERSION = "' + version + '"'), 'app runtime version must match package version'],
  [fs.readFileSync('src/version.ts', 'utf8').includes('APP_VERSION = "' + version + '"'), 'server build version must match package version'],
  [fs.readFileSync('src/maintenance.ts', 'utf8').includes('return APP_VERSION'), 'server status version must come from compiled build code'],
  [fs.readFileSync('src/alerts.ts', 'utf8').includes('return APP_VERSION'), 'system alerts must use compiled build version'],
  [app.includes('updateViaCache: "none"'), 'service worker updates must bypass browser cache'],
  [app.includes('ensureFreshAppVersion(status)'), 'app must detect stale UI against server version'],
  [app.includes('/api/diagnostics/print-engines') && app.includes('engineStatusCard'), 'diagnostics UI must show PDF print engine status'],
  [app.includes('downloadCustomerQaReport') && app.includes('my-pc-whatsapp-print-customer-qa'), 'diagnostics UI must export a customer QA report'],
  [sw.includes('my-pc-print-server-v' + cacheVersion), 'service worker cache version must match package version'],
  [!sw.includes('"/",'), 'service worker must not cache the HTML shell'],
  [sw.includes('event.request.mode === "navigate"') && sw.includes('fetch(event.request, { cache: "no-store" })'), 'navigation requests must bypass the service worker cache'],
  [css.includes('font-family: "Rubik"') || css.includes('font-family: Rubik'), 'Rubik must be the system font'],
  [css.includes('@media (prefers-reduced-motion: reduce)'), 'reduced motion must be respected'],
  [css.includes('@media (max-width: 620px)'), 'mobile responsive breakpoint must exist'],
  [css.includes('table-layout: fixed'), 'job tables must have stable column sizing'],
  [app.includes('function setOptionalText') && app.includes('if (element) element.textContent'), 'optional UI text setter must guard missing elements'],
  [app.includes('document.documentElement.dir'), 'language switching must update page direction'],
  [app.includes('window.lucide.createIcons'), 'Lucide icons must be initialized when available'],
  [app.includes('renderPrinterProfileCards') && app.includes('data-printer-profile-tab'), 'printer profiles must render as tabs'],
  [app.includes('/api/updates/check') && app.includes('/api/updates/run'), 'cloud update UI actions must be wired'],
  [app.includes('escapeHtml') && app.includes('escapeAttr'), 'dynamic UI strings must be escaped']
];

const failed = expectations.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error({ failed });
  process.exit(1);
}
'@

Invoke-NodeSmoke "UI static smoke" $uiStaticSmoke

$printEngineSmoke = @'
const { getPrintEngineStatus } = await import('./dist/printEngines.js');

const status = getPrintEngineStatus();
const failures = [];

if (typeof status.ok !== 'boolean') failures.push('status.ok must be boolean');
if (!status.sumatraPdf || typeof status.sumatraPdf.ok !== 'boolean') failures.push('sumatraPdf status is missing');
if (!status.ghostscript || typeof status.ghostscript.ok !== 'boolean') failures.push('ghostscript status is missing');
if (!Array.isArray(status.warnings)) failures.push('warnings must be an array');
if (status.ok !== status.sumatraPdf.ok) failures.push('overall ok must follow SumatraPDF availability');
if (!['configured', 'bundled', 'missing'].includes(status.sumatraPdf.source)) failures.push('invalid SumatraPDF source');
if (!['bundled', 'system', 'missing'].includes(status.ghostscript.source)) failures.push('invalid Ghostscript source');

if (failures.length) {
  console.error({ failures, status });
  process.exit(1);
}
'@

Invoke-NodeSmoke "Print engine diagnostics smoke" $printEngineSmoke

$versionSmoke = @'
const fs = await import('node:fs');
const { APP_VERSION } = await import('./dist/version.js');
const { getCurrentVersion } = await import('./dist/maintenance.js');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const failures = [];
if (APP_VERSION !== pkg.version) failures.push(`APP_VERSION ${APP_VERSION} does not match package ${pkg.version}`);
if (getCurrentVersion() !== APP_VERSION) failures.push('getCurrentVersion must return the compiled build version');

if (failures.length) {
  console.error({ failures });
  process.exit(1);
}
'@

Invoke-NodeSmoke "Compiled version smoke" $versionSmoke

$hebrewName = -join ([char[]](0x05D1, 0x05D3, 0x05D9, 0x05E7, 0x05EA))
$dryRunPdf = Join-Path ([System.IO.Path]::GetTempPath()) ("my-pc-" + $hebrewName + " pdf with spaces.pdf")
Set-Content -LiteralPath $dryRunPdf -Encoding ASCII -Value "%PDF-1.4`ntrailer <<>>"

try {
  $dryRunOutput = & ".\scripts\print-pdf-profile.ps1" `
    -FilePath $dryRunPdf `
    -PrinterName "QA Printer (USB)" `
    -SumatraPath "tools\SumatraPDF\SumatraPDF.exe" `
    -ColorMode grayscale `
    -DuplexMode simplex `
    -Orientation auto `
    -PaperSize A4 `
    -Scaling fill-page `
    -ScalePercent 90 `
    -Copies 1 `
    -Dpi 600 `
    -Quality high `
    -CompatibilityMode true `
    -DryRun

  $dryRunResult = $dryRunOutput | ConvertFrom-Json
  if (-not $dryRunResult.ok) {
    throw "PDF dry-run did not return ok."
  }
  if (-not [System.IO.Path]::IsPathRooted([string]$dryRunResult.sumatraPath)) {
    throw "PDF dry-run did not resolve a rooted SumatraPDF path."
  }
  if ([string]$dryRunResult.commandLine -notmatch [regex]::Escape('"QA Printer (USB)"')) {
    throw "PDF dry-run did not quote a printer name with spaces and parentheses."
  }
} finally {
  Remove-Item -LiteralPath $dryRunPdf -Force -ErrorAction SilentlyContinue
}

$officeDryRunDir = Join-Path ([System.IO.Path]::GetTempPath()) ("mypc-office-dryrun-" + [System.Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $officeDryRunDir | Out-Null

try {
  $dryRunFiles = @{
    image = Join-Path $officeDryRunDir "my-pc image.jpg"
    text = Join-Path $officeDryRunDir "my-pc text.txt"
    word = Join-Path $officeDryRunDir "my-pc word.docx"
    excel = Join-Path $officeDryRunDir "my-pc excel.xlsx"
    powerpoint = Join-Path $officeDryRunDir "my-pc powerpoint.pptx"
  }

  foreach ($file in $dryRunFiles.Values) {
    Set-Content -LiteralPath $file -Encoding ASCII -Value "QA dry run"
  }

  $dryRuns = @(
    @{
      Name = "Image"
      Output = & ".\scripts\print-image.ps1" -FilePath $dryRunFiles.image -PrinterName "QA Printer (USB)" -Copies 2 -DryRun
      Engine = "System.Drawing"
    },
    @{
      Name = "Text"
      Output = & ".\scripts\print-text.ps1" -FilePath $dryRunFiles.text -PrinterName "QA Printer (USB)" -Copies 2 -DryRun
      Engine = "System.Drawing"
    },
    @{
      Name = "Word"
      Output = & ".\scripts\print-word.ps1" -FilePath $dryRunFiles.word -PrinterName "QA Printer (USB)" -Copies 2 -DryRun
      Engine = "Word.Application"
    },
    @{
      Name = "Excel"
      Output = & ".\scripts\print-excel.ps1" -FilePath $dryRunFiles.excel -PrinterName "QA Printer (USB)" -Copies 2 -DryRun
      Engine = "Excel.Application"
    },
    @{
      Name = "PowerPoint"
      Output = & ".\scripts\print-powerpoint.ps1" `
        -FilePath $dryRunFiles.powerpoint `
        -PrinterName "QA Printer (USB)" `
        -SumatraPath "tools\SumatraPDF\SumatraPDF.exe" `
        -ColorMode grayscale `
        -DuplexMode simplex `
        -PaperSize A4 `
        -Scaling fill-page `
        -ScalePercent 90 `
        -Copies 2 `
        -Dpi 600 `
        -Quality high `
        -CompatibilityMode true `
        -DryRun
      Engine = "PowerPoint.Application -> PDF profile"
    }
  )

  foreach ($dryRun in $dryRuns) {
    $result = $dryRun.Output | ConvertFrom-Json
    if (-not $result.ok) {
      throw "$($dryRun.Name) dry-run did not return ok."
    }
    if ($result.printerName -ne "QA Printer (USB)") {
      throw "$($dryRun.Name) dry-run did not preserve printer name."
    }
    if ([int]$result.copies -ne 2) {
      throw "$($dryRun.Name) dry-run did not preserve copies."
    }
    if ($result.engine -ne $dryRun.Engine) {
      throw "$($dryRun.Name) dry-run returned unexpected engine: $($result.engine)"
    }
  }
} finally {
  Remove-Item -LiteralPath $officeDryRunDir -Recurse -Force -ErrorAction SilentlyContinue
}

$pdfSecuritySmoke = @'
const m = await import('./dist/pdfSecurity.js');
const fs = await import('node:fs');
const os = await import('node:os');
const path = await import('node:path');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypc-pdf-test-'));
const regularPdf = path.join(dir, 'regular.pdf');
const encryptedPdf = path.join(dir, 'encrypted.pdf');

fs.writeFileSync(regularPdf, '%PDF-1.4\n1 0 obj << /Type /Page >> endobj\ntrailer <<>>');
fs.writeFileSync(encryptedPdf, '%PDF-1.4\ntrailer << /Encrypt 7 0 R >>');

const hebrewPasswordText = '\u05e1\u05d9\u05e1\u05de\u05d4 1234';
const hebrewNaturalPasswordText = '\u05d4\u05e1\u05d9\u05e1\u05de\u05d4 \u05d4\u05d9\u05d0: 312830714';
const results = [
  m.isPasswordProtectedPdf(regularPdf) === false,
  m.isPasswordProtectedPdf(encryptedPdf) === true,
  m.extractPdfPassword(hebrewPasswordText) === '1234',
  m.extractPdfPassword(hebrewNaturalPasswordText) === '312830714',
  m.extractPdfPassword('password: abcd') === 'abcd',
  m.extractPdfPassword('abcd', true) === 'abcd'
];

fs.rmSync(dir, { recursive: true, force: true });
if (!results.every(Boolean)) {
  console.error(results);
  process.exit(1);
}
'@

Invoke-NodeSmoke "PDF security smoke" $pdfSecuritySmoke

$alertsSmoke = @'
const fs = await import('node:fs');
const alerts = await import('./dist/alerts.js');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const text = alerts.formatSystemAlert('Printer Offline', 'Unable to contact printer.', {
  jobId: 'job-123',
  customerName: 'Leon',
  customerPhone: '972500000000',
  fileName: 'invoice.pdf',
  fileType: 'pdf',
  fileSizeBytes: 1536,
  printerName: 'Olivetti d-Copia 400 KX (USB)',
  serverName: 'MY-PC WhatsApp Print Server',
  computerName: 'WIN11-PC',
  extra: { reason: 'Queue error' }
});

for (const expected of ['Printer Offline', 'Unable to contact printer.', 'job-123', 'Leon', '972500000000', 'invoice.pdf', 'pdf', '1.5 KB', 'Olivetti d-Copia 400 KX (USB)', 'WIN11-PC', 'Queue error', pkg.version, 'App version']) {
  if (!text.includes(expected)) {
    console.error({ missing: expected, text });
    process.exit(1);
  }
}
'@

Invoke-NodeSmoke "System alerts smoke" $alertsSmoke

$errorDetailsSmoke = @'
const { describeError, errorDetailsForAlert } = await import('./dist/errorDetails.js');

const err = new Error('Command failed: powershell.exe print-pdf-profile.ps1');
err.code = 1;
err.cmd = 'powershell.exe -NoProfile -File print-pdf-profile.ps1';
err.stdout = 'WARNING: Ghostscript was not found';
err.stderr = 'SumatraPDF print failed with exit code 7';
err.killed = false;

const description = describeError(err);
const details = errorDetailsForAlert(err);
const haystack = `${description}\n${JSON.stringify(details)}`;

for (const expected of ['Command failed', 'powershell.exe', 'Ghostscript', 'SumatraPDF', '7', 'Technical details']) {
  if (!haystack.includes(expected)) {
    console.error({ missing: expected, description, details });
    process.exit(1);
  }
}

const emptyDescription = describeError({});
const emptyDetails = errorDetailsForAlert({});
const emptyHaystack = `${emptyDescription}\n${JSON.stringify(emptyDetails)}`;
for (const expected of ['Unknown non-Error object was thrown.', 'constructorName', 'Technical details']) {
  if (!emptyHaystack.includes(expected)) {
    console.error({ missing: expected, emptyDescription, emptyDetails });
    process.exit(1);
  }
}
'@

Invoke-NodeSmoke "Error details smoke" $errorDetailsSmoke

$printQueueCommandSmoke = @'
const { buildStopPrintQueueCommand } = await import('./dist/printQueue.js');

const printerName = 'Olivetti d-Copia 400 KX (USB)';
const command = buildStopPrintQueueCommand(printerName);
const expectedBase64 = Buffer.from(printerName, 'utf8').toString('base64');

const failures = [];
if (!command.includes(expectedBase64)) failures.push('printer name must be passed as base64');
if (!command.includes('FromBase64String')) failures.push('command must decode the printer name inside PowerShell');
if (command.includes('$args[0]')) failures.push('command must not depend on args that are not passed');
if (command.includes(printerName)) failures.push('raw printer name must not be injected into the PowerShell command');
if (!command.includes('Get-PrintJob -PrinterName $printerName')) failures.push('command must use the decoded printer variable');
if (!command.includes('Write-Output $count')) failures.push('command must return the stopped job count');

if (failures.length) {
  console.error({ failures, command });
  process.exit(1);
}
'@

Invoke-NodeSmoke "Print queue command quoting smoke" $printQueueCommandSmoke

$fileValidationSmoke = @'
const fs = await import('node:fs');
const os = await import('node:os');
const path = await import('node:path');
const { defaultConfig } = await import('./dist/config.js');
const { validateAttachment } = await import('./dist/security.js');

const requiredTypes = ['doc', 'docx', 'rtf', 'txt', 'csv', 'xls', 'xlsx', 'ppt', 'pptx', 'jpg', 'jpeg', 'png', 'pdf'];
for (const type of requiredTypes) {
  if (!defaultConfig.allowedFileTypes.includes(type)) {
    console.error({ missingAllowedType: type, allowedFileTypes: defaultConfig.allowedFileTypes });
    process.exit(1);
  }
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypc-validation-test-'));
const cfbDoc = path.join(dir, 'legacy.doc');
const jpgFile = path.join(dir, 'photo.jpeg');
try {
  fs.writeFileSync(cfbDoc, Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00, 0x00, 0x00]));
  fs.writeFileSync(jpgFile, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]));

  const base = {
    id: 'qa',
    chatId: 'qa',
    senderName: 'QA',
    senderPhone: '972500000000',
    groupName: undefined,
    mimeType: 'application/octet-stream',
    sizeBytes: 12,
    messageKey: 'qa'
  };

  const docResult = await validateAttachment({ ...base, fileName: 'legacy.doc', extension: 'doc', filePath: cfbDoc }, defaultConfig);
  const imageResult = await validateAttachment({ ...base, fileName: 'photo.jpeg', extension: 'jpeg', filePath: jpgFile, mimeType: 'image/jpeg' }, defaultConfig);

  if (!docResult.ok || !imageResult.ok) {
    console.error({ docResult, imageResult });
    process.exit(1);
  }
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}
'@

Invoke-NodeSmoke "File validation smoke" $fileValidationSmoke

$startupRecoverySmoke = @'
const fs = await import('node:fs');
const os = await import('node:os');
const path = await import('node:path');
const { databasePath } = await import('./dist/paths.js');
const { savePrintLog, recoverInterruptedJobs } = await import('./dist/db.js');

const dbHadContent = fs.existsSync(databasePath);
const dbBackup = dbHadContent ? fs.readFileSync(databasePath) : undefined;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypc-startup-recovery-'));
const failedDir = path.join(tempDir, 'failed');
const receivedFile = path.join(tempDir, 'received.pdf');
const printingFile = path.join(tempDir, 'printing.pdf');

try {
  fs.writeFileSync(databasePath, JSON.stringify({ jobs: [] }, null, 2), 'utf8');
  fs.writeFileSync(receivedFile, 'received');
  fs.writeFileSync(printingFile, 'printing');

  const base = {
    chatId: 'qa',
    senderName: 'QA',
    senderPhone: '972500000000',
    mimeType: 'application/pdf',
    extension: 'pdf',
    sizeBytes: 1,
    printerName: 'QA Printer (USB)'
  };

  savePrintLog({
    ...base,
    id: 'qa-received',
    messageKey: 'qa-received-key',
    createdAt: '2026-07-03T00:00:00.000Z',
    fileName: 'received.pdf',
    filePath: receivedFile,
    status: 'received'
  });
  savePrintLog({
    ...base,
    id: 'qa-printing',
    messageKey: 'qa-printing-key',
    createdAt: '2026-07-03T00:00:01.000Z',
    fileName: 'printing.pdf',
    filePath: printingFile,
    status: 'printing'
  });

  const result = recoverInterruptedJobs(failedDir, 'QA Printer (USB)');
  const stored = JSON.parse(fs.readFileSync(databasePath, 'utf8')).jobs;
  const recoveredJobs = stored.filter((job) => job.id.startsWith('qa-'));

  if (result.recovered !== 2 || result.movedFiles !== 2 || recoveredJobs.length !== 2) {
    console.error({ stage: 'startup-recovery-counts', result, recoveredJobs });
    process.exit(1);
  }

  for (const job of recoveredJobs) {
    if (job.status !== 'failed' || !job.failure_reason || !job.file_path.startsWith(failedDir) || !fs.existsSync(job.file_path)) {
      console.error({ stage: 'startup-recovery-job', job, failedDir });
      process.exit(1);
    }
  }
} finally {
  if (dbHadContent) {
    fs.writeFileSync(databasePath, dbBackup);
  } else {
    fs.rmSync(databasePath, { force: true });
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
}
'@

Invoke-NodeSmoke "Startup recovery smoke" $startupRecoverySmoke

$cryptoPdf = (Resolve-Path "tests\fixtures\encrypted-password-312830714.pdf").Path

$pdfCryptoSmoke = @'
const m = await import('./dist/pdfSecurity.js');
const p = await import('./dist/pageCounter.js');
const pdf = process.argv.at(-1);
const protectedPdf = m.isPasswordProtectedPdf(pdf);
const wrong = await m.verifyPdfPassword(pdf, 'wrong', 'tools/SumatraPDF/SumatraPDF.exe');
const right = await m.verifyPdfPassword(pdf, '312830714', 'tools/SumatraPDF/SumatraPDF.exe');
const pages = await p.countAttachmentPages({
  id: 'qa',
  chatId: 'qa',
  senderName: 'QA',
  senderPhone: '972500000000',
  fileName: 'encrypted.pdf',
  mimeType: 'application/pdf',
  extension: 'pdf',
  sizeBytes: 1,
  filePath: pdf,
  messageKey: 'qa',
  pdfPassword: '312830714'
});

if (!protectedPdf || wrong.ok || !right.ok || pages !== 1) {
  console.error({ protectedPdf, wrong, right, pages });
  process.exit(1);
}
'@

Invoke-NodeSmoke "Encrypted PDF password verification" $pdfCryptoSmoke @($cryptoPdf)

$passwordPdfDryRun = powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\print-pdf-profile.ps1 `
  -FilePath $cryptoPdf `
  -PrinterName "Olivetti d-Copia 400 KX (USB)" `
  -SumatraPath "tools\SumatraPDF\SumatraPDF.exe" `
  -ColorMode grayscale `
  -DuplexMode simplex `
  -Orientation auto `
  -PaperSize A4 `
  -Scaling fill-page `
  -ScalePercent 90 `
  -Copies 1 `
  -Dpi 600 `
  -Quality high `
  -CompatibilityMode true `
  -PdfPassword "312830714" `
  -DryRun | Out-String

foreach ($expected in @(
  '"ok":  true',
  '"printerName":  "Olivetti d-Copia 400 KX (USB)"',
  '"-pwd"',
  '"312830714"',
  'SumatraPDF.exe'
)) {
  if ($passwordPdfDryRun -notmatch [regex]::Escape($expected)) {
    throw "Encrypted PDF dry-run did not include expected value: $expected"
  }
}

$printOrderPasswordFlowSmoke = @'
const fs = await import('node:fs');
const os = await import('node:os');
const path = await import('node:path');
const { PrintOrderManager } = await import('./dist/printOrders.js');
const { defaultConfig } = await import('./dist/config.js');
const configModule = await import('./dist/config.js');
const alerts = await import('./dist/alerts.js');
const { databasePath, appPaths, settingsPath } = await import('./dist/paths.js');

const sourcePdf = process.argv.at(-1);
const dbHadContent = fs.existsSync(databasePath);
const dbBackup = dbHadContent ? fs.readFileSync(databasePath) : undefined;
const settingsHadContent = fs.existsSync(settingsPath);
const settingsBackup = settingsHadContent ? fs.readFileSync(settingsPath) : undefined;
const runId = `qa-password-flow-${Date.now()}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypc-order-flow-'));
const managerAlertPhone = '972501234567';
const ownerAlertPhone = '972522250223';

function config() {
  return {
    ...defaultConfig,
    printerName: 'QA Printer',
    alertsEnabled: false,
    allowedNumbers: [],
    allowedGroups: [],
    allowedFileTypes: [...defaultConfig.allowedFileTypes],
    customerMessages: {
      ...defaultConfig.customerMessages,
      failed: 'FAILED',
      queued: 'QUEUED',
      fileAdded: 'ADDED',
      canceled: 'CANCELED',
      reminder: 'REMINDER'
    }
  };
}

function attachment(filePath, id, messageText = '') {
  return {
    id,
    chatId: `${runId}@s.whatsapp.net`,
    senderName: 'QA Customer',
    senderPhone: '972500000000',
    fileName: `${id}.pdf`,
    mimeType: 'application/pdf',
    extension: 'pdf',
    sizeBytes: fs.statSync(filePath).size,
    filePath,
    messageText,
    messageKey: `${runId}:${id}`
  };
}

function cleanupManager(manager) {
  const orders = manager.orders;
  if (!orders) return;
  for (const order of orders.values()) {
    if (order.reminderTimer) clearInterval(order.reminderTimer);
    if (order.expiryTimer) clearTimeout(order.expiryTimer);
    if (order.promoTimer) clearTimeout(order.promoTimer);
    if (order.customerMarketingTimer) clearTimeout(order.customerMarketingTimer);
  }
  orders.clear();
}

async function waitForAlerts(sent, count) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 3000) {
    if (sent.length >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

try {
  fs.mkdirSync(appPaths.failedDir, { recursive: true });
  fs.mkdirSync(appPaths.downloadsDir, { recursive: true });
  configModule.saveConfig({
    ...defaultConfig,
    printerName: 'QA Printer',
    alertsEnabled: true,
    alertsPhone: managerAlertPhone,
    allowedNumbers: [],
    allowedGroups: []
  });

  const alertMessages = [];
  alerts.registerAlertSender(async (phone, text) => alertMessages.push({ phone, text }));

  const wrongPdf = path.join(tempDir, `${runId}-wrong.pdf`);
  const rightPdf = path.join(tempDir, `${runId}-right.pdf`);
  fs.copyFileSync(sourcePdf, wrongPdf);
  fs.copyFileSync(sourcePdf, rightPdf);

  const wrongMessages = [];
  const wrongManager = new PrintOrderManager(config, async (_jid, text) => wrongMessages.push(text));
  await wrongManager.receiveAttachment(attachment(wrongPdf, `${runId}-wrong`));

  if (!wrongMessages.some((message) => message.includes(`${runId}-wrong.pdf`) && message.includes('1234'))) {
    console.error({ stage: 'missing-password-prompt', wrongMessages });
    process.exit(1);
  }

  const wrongHandled = await wrongManager.receiveText('972500000000', `${runId}@s.whatsapp.net`, 'wrong-password');
  const wrongOrderStillExists = await wrongManager.receiveText('972500000000', `${runId}@s.whatsapp.net`, '1');
  if (!wrongHandled || wrongOrderStillExists || !wrongMessages.includes('FAILED')) {
    console.error({ stage: 'wrong-password-flow', wrongHandled, wrongOrderStillExists, wrongMessages });
    process.exit(1);
  }

  await waitForAlerts(alertMessages, 2);
  const alertPhones = alertMessages.map((message) => message.phone).sort();
  const alertText = alertMessages.map((message) => message.text).join('\n---\n');
  for (const expected of [managerAlertPhone, ownerAlertPhone]) {
    if (!alertPhones.includes(expected)) {
      console.error({ stage: 'password-alert-recipients', missing: expected, alertPhones, alertMessages });
      process.exit(1);
    }
  }
  for (const expected of [`${runId}-wrong.pdf`, 'QA Customer', '972500000000', 'QA Printer', 'PDF password is missing or incorrect.']) {
    if (!alertText.includes(expected)) {
      console.error({ stage: 'password-alert-details', missing: expected, alertText });
      process.exit(1);
    }
  }
  cleanupManager(wrongManager);

  const rightMessages = [];
  const rightManager = new PrintOrderManager(config, async (_jid, text) => rightMessages.push(text));
  await rightManager.receiveAttachment(attachment(rightPdf, `${runId}-right`));

  const rightHandled = await rightManager.receiveText('972500000000', `${runId}@s.whatsapp.net`, '312830714');
  if (!rightHandled || rightMessages.includes('QUEUED') || !rightMessages.some((message) => message.includes('PDF'))) {
    console.error({ stage: 'right-password-flow', rightHandled, rightMessages });
    process.exit(1);
  }
  cleanupManager(rightManager);
} finally {
  for (const dir of [appPaths.failedDir, appPaths.downloadsDir, tempDir]) {
    if (!fs.existsSync(dir)) continue;
    for (const item of fs.readdirSync(dir)) {
      if (item.includes(runId)) {
        fs.rmSync(path.join(dir, item), { recursive: true, force: true });
      }
    }
  }

  if (dbHadContent) {
    fs.writeFileSync(databasePath, dbBackup);
  } else if (fs.existsSync(databasePath)) {
    fs.rmSync(databasePath, { force: true });
  }

  if (settingsHadContent) {
    fs.writeFileSync(settingsPath, settingsBackup);
  } else if (fs.existsSync(settingsPath)) {
    fs.rmSync(settingsPath, { force: true });
  }
}
'@

Invoke-NodeSmoke "Encrypted PDF order flow" $printOrderPasswordFlowSmoke @($cryptoPdf)

Write-Host "QA smoke checks passed."
