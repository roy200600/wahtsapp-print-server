param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [int]$Copies = 1,

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "Text file not found: $FilePath"
}

if ($DryRun) {
  [pscustomobject]@{
    ok = $true
    filePath = (Resolve-Path -LiteralPath $FilePath).Path
    printerName = $PrinterName
    copies = [Math]::Max(1, $Copies)
    engine = "System.Drawing"
  } | ConvertTo-Json -Depth 5
  exit 0
}

$printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $printer) {
  throw "Printer not found: $PrinterName"
}

$script:lines = [System.Collections.Generic.List[string]]::new()
foreach ($line in [System.IO.File]::ReadLines($FilePath, [System.Text.Encoding]::UTF8)) {
  $script:lines.Add($line)
}

if ($script:lines.Count -eq 0) {
  $script:lines.Add("")
}

$script:index = 0
$font = New-Object System.Drawing.Font("Arial", 10)
$brush = [System.Drawing.Brushes]::Black
$document = New-Object System.Drawing.Printing.PrintDocument
$document.PrinterSettings.PrinterName = $PrinterName
$document.PrinterSettings.Copies = [int16][Math]::Max(1, $Copies)
$document.DocumentName = [System.IO.Path]::GetFileName($FilePath)

if (-not $document.PrinterSettings.IsValid) {
  $font.Dispose()
  throw "Printer is not valid or unavailable: $PrinterName"
}

$document.add_PrintPage({
  param($sender, $event)

  $lineHeight = $font.GetHeight($event.Graphics)
  $x = $event.MarginBounds.Left
  $y = $event.MarginBounds.Top

  while ($script:index -lt $script:lines.Count) {
    if ($y + $lineHeight -gt $event.MarginBounds.Bottom) {
      $event.HasMorePages = $true
      return
    }

    $event.Graphics.DrawString($script:lines[$script:index], $font, $brush, $x, $y)
    $script:index += 1
    $y += $lineHeight
  }

  $event.HasMorePages = $false
})

try {
  $document.Print()
} finally {
  $document.Dispose()
  $font.Dispose()
}
