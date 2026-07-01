param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [int]$Copies = 1
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "File not found: $FilePath"
}

$image = [System.Drawing.Image]::FromFile($FilePath)
$document = New-Object System.Drawing.Printing.PrintDocument
$document.PrinterSettings.PrinterName = $PrinterName
$document.PrinterSettings.Copies = [int16][Math]::Max(1, $Copies)
$document.DocumentName = [System.IO.Path]::GetFileName($FilePath)

if (-not $document.PrinterSettings.IsValid) {
  $image.Dispose()
  throw "Printer is not valid or unavailable: $PrinterName"
}

$document.add_PrintPage({
  param($sender, $event)

  $bounds = $event.MarginBounds
  $ratio = [Math]::Min($bounds.Width / $image.Width, $bounds.Height / $image.Height)
  $width = [int]($image.Width * $ratio)
  $height = [int]($image.Height * $ratio)
  $x = $bounds.X + [int](($bounds.Width - $width) / 2)
  $y = $bounds.Y + [int](($bounds.Height - $height) / 2)

  $event.Graphics.DrawImage($image, $x, $y, $width, $height)
  $event.HasMorePages = $false
})

try {
  $document.Print()
} finally {
  $document.Dispose()
  $image.Dispose()
}
