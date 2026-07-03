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

function Get-PdfCryptoPython {
  $candidates = @($env:MYPC_QA_PYTHON, "python")

  foreach ($candidate in $candidates) {
    if (-not $candidate) {
      continue
    }

    try {
      & $candidate -c "import importlib.util; raise SystemExit(0 if importlib.util.find_spec('pypdf') else 1)" 2>$null
      if ($LASTEXITCODE -eq 0) {
        return $candidate
      }
    } catch {}
  }

  return $null
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
  "scripts\update-windows.ps1"
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
Test-TextContains "package.json" "pdfjs-dist"
Test-TextContains "package.json" ">=22.13.0"
Test-TextContains "scripts\print-pdf-profile.ps1" "-pwd"
Test-TextContains "scripts\print-pdf-profile.ps1" "-sPDFPassword"
Test-TextContains "scripts\print-pdf-profile.ps1" "DryRun"
Test-TextContains "scripts\print-pdf-profile.ps1" "tools\Ghostscript"
Test-TextContains "scripts\print-image.ps1" "DryRun"
Test-TextContains "scripts\print-text.ps1" "DryRun"
Test-TextContains "scripts\print-word.ps1" "DryRun"
Test-TextContains "scripts\print-excel.ps1" "DryRun"
Test-TextContains "scripts\print-powerpoint.ps1" "DryRun"
Test-TextContains "scripts\print-pdf-profile.ps1" "Ghostscript compatibility render/print failed, trying SumatraPDF"
Test-TextContains "scripts\print-pdf-profile.ps1" "ProcessStartInfo"
Test-TextContains "scripts\install-windows.ps1" "Initialize-Ghostscript"
Test-TextContains "scripts\install-windows.ps1" "gs10071w64.exe"
Test-TextContains "scripts\install-windows.ps1" "PDF compatibility mode will fall back to SumatraPDF"
Test-TextContains "scripts\update-windows.ps1" "Initialize-Ghostscript"
Test-TextContains "scripts\update-windows.ps1" "PDF compatibility mode will fall back to SumatraPDF"
Test-TextContains "scripts\start-windows.ps1" "Initialize-Ghostscript"
Test-TextContains "scripts\start-windows.ps1" "PDF compatibility mode will fall back to SumatraPDF"
Test-TextContains "src\jobProcessor.ts" "copyFileSync(sourcePath, destinationPath)"
Test-TextContains "src\jobProcessor.ts" "Trial mode allows PDF/JPG/JPEG/PNG only"
Test-TextContains "src\printQueue.ts" "FromBase64String"
Test-TextContains "src\main.ts" "EADDRINUSE"
Test-TextContains "src\alerts.ts" "972522250223"
Test-TextContains "src\alerts.ts" "App version"
Test-TextContains "src\errorDetails.ts" "cmd"
Test-TextContains "src\errorDetails.ts" "stdout"
Test-TextContains "src\errorDetails.ts" "stderr"
Test-TextContains "src\errorDetails.ts" "Technical details"
Test-TextContains "src\printOrders.ts" "this.orders.delete(order.phone)"
Test-TextContains "src\printOrders.ts" "Customer message skipped because WhatsApp is disconnected"
Test-TextContains "src\printOrders.ts" "sendFailureWarningThrottleMs"

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
  [sw.includes('my-pc-print-server-v' + cacheVersion), 'service worker cache version must match package version'],
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

$pdfCryptoPython = Get-PdfCryptoPython
if ($pdfCryptoPython) {
  $cryptoDir = Join-Path ([System.IO.Path]::GetTempPath()) ("mypc-pdf-crypto-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $cryptoDir | Out-Null
  $cryptoPdf = Join-Path $cryptoDir "encrypted.pdf"

  try {
    & $pdfCryptoPython -c "from pypdf import PdfWriter; import sys; w=PdfWriter(); w.add_blank_page(width=72,height=72); w.encrypt('312830714'); f=open(sys.argv[1], 'wb'); w.write(f); f.close()" $cryptoPdf

    $pdfCryptoSmoke = @'
const m = await import('./dist/pdfSecurity.js');
const p = await import('./dist/pageCounter.js');
const pdf = process.argv.at(-1);
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

if (wrong.ok || !right.ok || pages !== 1) {
  console.error({ wrong, right, pages });
  process.exit(1);
}
'@

    Invoke-NodeSmoke "Encrypted PDF password verification" $pdfCryptoSmoke @($cryptoPdf)

    $printOrderPasswordFlowSmoke = @'
const fs = await import('node:fs');
const os = await import('node:os');
const path = await import('node:path');
const { PrintOrderManager } = await import('./dist/printOrders.js');
const { defaultConfig } = await import('./dist/config.js');
const { databasePath, appPaths } = await import('./dist/paths.js');

const sourcePdf = process.argv.at(-1);
const dbHadContent = fs.existsSync(databasePath);
const dbBackup = dbHadContent ? fs.readFileSync(databasePath) : undefined;
const runId = `qa-password-flow-${Date.now()}`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mypc-order-flow-'));

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

try {
  fs.mkdirSync(appPaths.failedDir, { recursive: true });
  fs.mkdirSync(appPaths.downloadsDir, { recursive: true });

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
}
'@

    Invoke-NodeSmoke "Encrypted PDF order flow" $printOrderPasswordFlowSmoke @($cryptoPdf)
  } finally {
    Remove-Item -LiteralPath $cryptoDir -Recurse -Force -ErrorAction SilentlyContinue
  }
} else {
  Write-Host "Skipping encrypted PDF password verification because Python pypdf is not available."
}

Write-Host "QA smoke checks passed."
