param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [ValidateSet("auto", "portrait", "landscape")]
  [string]$Orientation = "auto",

  [string]$PaperSize = "A4",

  [int]$ScalePercent = 100,

  [int]$Copies = 1,

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "File not found: $FilePath"
}

$safeCopies = [Math]::Max(1, [Math]::Min(99, $Copies))
$safeScalePercent = [Math]::Max(10, [Math]::Min(100, $ScalePercent))
$scaleFactor = $safeScalePercent / 100.0
$safePaperSize = ($PaperSize -replace '[^A-Za-z0-9_-]', '').ToUpper()
if ([string]::IsNullOrWhiteSpace($safePaperSize)) {
  $safePaperSize = "A4"
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

function Get-PaperBounds {
  param(
    [System.Drawing.Printing.PrintDocument]$Document,
    [string]$RequestedPaperSize
  )

  $requested = $RequestedPaperSize.ToUpperInvariant()
  foreach ($paper in $Document.PrinterSettings.PaperSizes) {
    if ([string]$paper.Kind -eq $requested -or $paper.PaperName.ToUpperInvariant() -eq $requested) {
      return $paper
    }
  }

  return $Document.DefaultPageSettings.PaperSize
}

function Get-ContainLayout {
  param(
    [int]$ImageWidth,
    [int]$ImageHeight,
    [int]$BoundsX,
    [int]$BoundsY,
    [int]$BoundsWidth,
    [int]$BoundsHeight,
    [double]$Scale
  )

  $ratio = [Math]::Min($BoundsWidth / [double]$ImageWidth, $BoundsHeight / [double]$ImageHeight)
  $ratio = $ratio * $Scale

  $width = [Math]::Max(1, [int][Math]::Floor($ImageWidth * $ratio))
  $height = [Math]::Max(1, [int][Math]::Floor($ImageHeight * $ratio))

  if ($width -gt $BoundsWidth -or $height -gt $BoundsHeight) {
    $fitRatio = [Math]::Min($BoundsWidth / [double]$width, $BoundsHeight / [double]$height)
    $width = [Math]::Max(1, [int][Math]::Floor($width * $fitRatio))
    $height = [Math]::Max(1, [int][Math]::Floor($height * $fitRatio))
  }

  return [pscustomobject]@{
    x = $BoundsX + [int][Math]::Floor(($BoundsWidth - $width) / 2)
    y = $BoundsY + [int][Math]::Floor(($BoundsHeight - $height) / 2)
    width = $width
    height = $height
    ratio = $ratio
  }
}

$document = New-Object System.Drawing.Printing.PrintDocument
$document.PrinterSettings.PrinterName = $PrinterName
$document.PrinterSettings.Copies = [int16]$safeCopies
$document.DocumentName = [System.IO.Path]::GetFileName($FilePath)

if (-not $document.PrinterSettings.IsValid) {
  $image.Dispose()
  throw "Printer is not valid or unavailable: $PrinterName"
}

$paperSizeObject = Get-PaperBounds -Document $document -RequestedPaperSize $safePaperSize
if ($paperSizeObject) {
  $document.DefaultPageSettings.PaperSize = $paperSizeObject
}

$paperWidth = [int]$document.DefaultPageSettings.PaperSize.Width
$paperHeight = [int]$document.DefaultPageSettings.PaperSize.Height
$imageIsLandscape = $image.Width -gt $image.Height
$paperIsLandscape = $paperWidth -gt $paperHeight
$useLandscape = switch ($Orientation) {
  "landscape" { $true }
  "portrait" { $false }
  default { $imageIsLandscape -ne $paperIsLandscape }
}

$document.DefaultPageSettings.Landscape = $useLandscape
$document.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

if ($DryRun) {
  $pageWidth = if ($useLandscape) { [Math]::Max($paperWidth, $paperHeight) } else { [Math]::Min($paperWidth, $paperHeight) }
  $pageHeight = if ($useLandscape) { [Math]::Min($paperWidth, $paperHeight) } else { [Math]::Max($paperWidth, $paperHeight) }
  $safePadding = 8
  $layout = Get-ContainLayout `
    -ImageWidth $image.Width `
    -ImageHeight $image.Height `
    -BoundsX $safePadding `
    -BoundsY $safePadding `
    -BoundsWidth ([Math]::Max(1, $pageWidth - ($safePadding * 2))) `
    -BoundsHeight ([Math]::Max(1, $pageHeight - ($safePadding * 2))) `
    -Scale $scaleFactor

  [pscustomobject]@{
    ok = $true
    filePath = (Resolve-Path -LiteralPath $FilePath).Path
    printerName = $PrinterName
    copies = $safeCopies
    engine = "System.Drawing"
    mode = "fit-without-crop"
    orientation = if ($useLandscape) { "landscape" } else { "portrait" }
    paperSize = $document.DefaultPageSettings.PaperSize.PaperName
    image = @{
      width = $image.Width
      height = $image.Height
      dpiX = $image.HorizontalResolution
      dpiY = $image.VerticalResolution
    }
    page = @{
      width = $pageWidth
      height = $pageHeight
    }
    layout = $layout
    willCrop = $false
  } | ConvertTo-Json -Depth 5
  $document.Dispose()
  $image.Dispose()
  exit 0
}

$document.add_PrintPage({
  param($sender, $event)

  $hardMarginX = [int][Math]::Ceiling($event.PageSettings.HardMarginX)
  $hardMarginY = [int][Math]::Ceiling($event.PageSettings.HardMarginY)
  $printable = $event.PageSettings.PrintableArea
  $padding = 8
  $boundsX = [Math]::Max(0, $hardMarginX + $padding)
  $boundsY = [Math]::Max(0, $hardMarginY + $padding)
  $boundsWidth = [Math]::Max(1, [int]$printable.Width - ($padding * 2))
  $boundsHeight = [Math]::Max(1, [int]$printable.Height - ($padding * 2))
  $layout = Get-ContainLayout `
    -ImageWidth $image.Width `
    -ImageHeight $image.Height `
    -BoundsX $boundsX `
    -BoundsY $boundsY `
    -BoundsWidth $boundsWidth `
    -BoundsHeight $boundsHeight `
    -Scale $scaleFactor

  $event.Graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $event.Graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $event.Graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $event.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $event.Graphics.DrawImage($image, $layout.x, $layout.y, $layout.width, $layout.height)
  $event.HasMorePages = $false
})

try {
  $document.Print()
} finally {
  $document.Dispose()
  $image.Dispose()
}
