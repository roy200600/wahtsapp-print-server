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

if (-not $SkipBuild) {
  npm run build
}

Assert-FileExists "public\assets\fonts\Rubik-Variable.ttf"
Assert-FileExists "tools\SumatraPDF\SumatraPDF.exe"
Assert-FileExists "docs\QA-1.0.19.md"
Assert-FileExists "docs\QA-1.0.21.md"
Assert-FileExists "docs\QA-1.0.22.md"
Assert-FileExists "docs\QA-1.0.23.md"
Assert-FileExists "docs\QA-1.0.24.md"

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
Test-TextContains "public\styles.css" "Rubik-Variable.ttf"
Test-TextContains "public\styles.css" ":focus-visible"
Test-TextContains "public\styles.css" "prefers-reduced-motion"
Test-TextContains "public\styles.css" "overflow-x: hidden"
Test-TextContains "public\styles.css" "@media (max-width:"
Test-TextContains "package.json" "pdfjs-dist"
Test-TextContains "package.json" ">=22.13.0"
Test-TextContains "scripts\print-pdf-profile.ps1" "-pwd"
Test-TextContains "scripts\print-pdf-profile.ps1" "-sPDFPassword"
Test-TextContains "scripts\print-pdf-profile.ps1" "DryRun"
Test-TextContains "src\jobProcessor.ts" "copyFileSync(sourcePath, destinationPath)"

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

node --input-type=module -e $pdfSecuritySmoke

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
const pdf = process.argv[1];
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

    node --input-type=module -e $pdfCryptoSmoke $cryptoPdf
  } finally {
    Remove-Item -LiteralPath $cryptoDir -Recurse -Force -ErrorAction SilentlyContinue
  }
} else {
  Write-Host "Skipping encrypted PDF password verification because Python pypdf is not available."
}

Write-Host "QA smoke checks passed."
