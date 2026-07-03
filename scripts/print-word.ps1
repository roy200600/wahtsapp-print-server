param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [int]$Copies = 1,

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "Word file not found: $FilePath"
}

if ($DryRun) {
  [pscustomobject]@{
    ok = $true
    filePath = (Resolve-Path -LiteralPath $FilePath).Path
    printerName = $PrinterName
    copies = [Math]::Max(1, $Copies)
    engine = "Word.Application"
    openReadOnly = $true
  } | ConvertTo-Json -Depth 5
  exit 0
}

$printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $printer) {
  throw "Printer not found: $PrinterName"
}

$word = $null
$document = $null
$tempDir = $null
$tempFilePath = $null

try {
  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("my-pc-word-" + [guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
  $tempFilePath = Join-Path $tempDir ([System.IO.Path]::GetFileName($FilePath))
  Copy-Item -LiteralPath $FilePath -Destination $tempFilePath -Force

  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $word.ActivePrinter = $PrinterName
  $document = $word.Documents.Open($tempFilePath, $false, $true)

  for ($i = 0; $i -lt [Math]::Max(1, $Copies); $i++) {
    $document.PrintOut($false)
  }
} finally {
  if ($document) {
    $document.Close($false)
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($document)
  }
  if ($word) {
    $word.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($word)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if ($tempDir -and (Test-Path -LiteralPath $tempDir)) {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}
