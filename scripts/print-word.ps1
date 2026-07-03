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

try {
  $word = New-Object -ComObject Word.Application
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $word.ActivePrinter = $PrinterName
  $document = $word.Documents.Open($FilePath, $false, $true)

  for ($i = 0; $i -lt [Math]::Max(1, $Copies); $i++) {
    $document.PrintOut()
  }
} finally {
  if ($document) {
    $document.Close($false)
  }
  if ($word) {
    $word.Quit()
  }
}
