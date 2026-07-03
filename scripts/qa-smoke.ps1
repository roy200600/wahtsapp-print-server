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

if (-not $SkipBuild) {
  npm run build
}

Assert-FileExists "public\assets\fonts\Rubik-Variable.ttf"
Assert-FileExists "tools\SumatraPDF\SumatraPDF.exe"
Assert-FileExists "docs\QA-1.0.19.md"
Assert-FileExists "docs\QA-1.0.21.md"

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
Test-TextContains "scripts\print-pdf-profile.ps1" "-pwd"
Test-TextContains "scripts\print-pdf-profile.ps1" "-sPDFPassword"

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

Write-Host "QA smoke checks passed."
