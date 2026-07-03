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
  throw "File not found: $FilePath"
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

$image = [System.Drawing.Image]::FromFile($FilePath)

try {
  $orientationProperty = $image.GetPropertyItem(274)
  if ($orientationProperty -and $orientationProperty.Value.Length -gt 0) {
    switch ([int]$orientationProperty.Value[0]) {
      2 { $image.RotateFlip([System.Drawing.RotateFlipType]::RotateNoneFlipX) }
      3 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
      4 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipX) }
      5 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipX) }
      6 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
      7 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipX) }
      8 { $image.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
    }
    $image.RemovePropertyItem(274)
  }
} catch {}

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
