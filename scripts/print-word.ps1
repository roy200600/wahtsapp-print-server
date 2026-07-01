param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [int]$Copies = 1
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "Word file not found: $FilePath"
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
