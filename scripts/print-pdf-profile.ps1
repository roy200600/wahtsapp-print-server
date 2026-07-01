param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [Parameter(Mandatory = $true)]
  [string]$SumatraPath,

  [ValidateSet("color", "grayscale")]
  [string]$ColorMode = "color",

  [ValidateSet("simplex", "long-edge", "short-edge")]
  [string]$DuplexMode = "simplex",

  [ValidateSet("auto", "portrait", "landscape")]
  [string]$Orientation = "auto",

  [string]$PaperSize = "A4",

  [ValidateSet("fill-page", "fit", "actual-size", "shrink")]
  [string]$Scaling = "fit",

  [int]$ScalePercent = 100,

  [int]$Copies = 1,
  [int]$Dpi = 600,

  [ValidateSet("draft", "normal", "high")]
  [string]$Quality = "high",

  [string]$CompatibilityMode = "true"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "PDF file not found: $FilePath"
}

$printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $printer) {
  throw "Printer not found: $PrinterName"
}

$safeCopies = [Math]::Max(1, [Math]::Min(99, $Copies))
$safeDpi = [Math]::Max(72, [Math]::Min(2400, $Dpi))
$safeScalePercent = [Math]::Max(50, [Math]::Min(200, $ScalePercent))
$scaleFactor = $safeScalePercent / 100.0
$safePaperSize = ($PaperSize -replace '[^A-Za-z0-9_-]', '').ToUpper()
if ([string]::IsNullOrWhiteSpace($safePaperSize)) {
  $safePaperSize = "A4"
}

function Convert-DuplexMode {
  param([string]$Mode)
  switch ($Mode) {
    "long-edge" { "TwoSidedLongEdge" }
    "short-edge" { "TwoSidedShortEdge" }
    default { "OneSided" }
  }
}

function Convert-SumatraScaling {
  param([string]$Value)
  switch ($Value) {
    "actual-size" { "noscale" }
    "shrink" { "shrink" }
    "fill-page" { "fit" }
    default { "fit" }
  }
}

function Convert-SumatraDuplex {
  param([string]$Mode)
  switch ($Mode) {
    "long-edge" { "duplex" }
    "short-edge" { "duplexshort" }
    default { "simplex" }
  }
}

function Find-Ghostscript {
  $command = Get-Command gswin64c.exe -ErrorAction SilentlyContinue
  if ($command) {
    return $command.Source
  }

  $knownPaths = @(
    "C:\Program Files\gs\*\bin\gswin64c.exe",
    "C:\Program Files (x86)\gs\*\bin\gswin32c.exe"
  )

  foreach ($pattern in $knownPaths) {
    $match = Get-ChildItem -Path $pattern -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
    if ($match) {
      return $match.FullName
    }
  }

  return $null
}

function Apply-DriverProfile {
  $parameters = @{
    PrinterName = $PrinterName
  }

  $setPrintConfiguration = Get-Command Set-PrintConfiguration -ErrorAction SilentlyContinue
  if (-not $setPrintConfiguration) {
    return
  }

  $available = $setPrintConfiguration.Parameters.Keys
  if ($available -contains "Color") {
    $parameters.Color = ($ColorMode -eq "color")
  }
  if ($available -contains "DuplexingMode") {
    $parameters.DuplexingMode = Convert-DuplexMode $DuplexMode
  }
  if ($available -contains "PaperSize") {
    $parameters.PaperSize = $safePaperSize
  }

  try {
    Set-PrintConfiguration @parameters -ErrorAction Stop
  } catch {
    Write-Warning "Printer driver did not accept the PDF profile: $($_.Exception.Message)"
  }
}

function Send-WithGhostscript {
  $ghostscriptPath = Find-Ghostscript
  if (-not $ghostscriptPath) {
    throw "Ghostscript was not found"
  }

  $paperArg = "-sPAPERSIZE=$($safePaperSize.ToLowerInvariant())"
  $deviceArgs = @(
    "-dBATCH",
    "-dNOPAUSE",
    "-dSAFER",
    "-dPrinted",
    "-sDEVICE=mswinpr2",
    "-sOutputFile=%printer%$PrinterName",
    "-r$safeDpi",
    $paperArg,
    "-dNumCopies=$safeCopies"
  )

  if ($Scaling -eq "fill-page" -or $Scaling -eq "fit" -or $Scaling -eq "shrink") {
    $deviceArgs += "-dFitPage"
  }

  if ($ColorMode -eq "grayscale") {
    $deviceArgs += @(
      "-sColorConversionStrategy=Gray",
      "-dProcessColorModel=/DeviceGray",
      "-dOverrideICC"
    )
  }

  $duplexCommand = switch ($DuplexMode) {
    "long-edge" { "<</Duplex true /Tumble false>> setpagedevice" }
    "short-edge" { "<</Duplex true /Tumble true>> setpagedevice" }
    default { "<</Duplex false>> setpagedevice" }
  }

  $arguments = $deviceArgs + @("-c", $duplexCommand, "-f", $FilePath)
  & $ghostscriptPath @arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Ghostscript PDF print failed with exit code $LASTEXITCODE"
  }
}

function Add-PdfImageCropperType {
  if ("MyPc.PdfImageCropper" -as [type]) {
    return
  }

  Add-Type -ReferencedAssemblies "System.Drawing" -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

namespace MyPc
{
  public static class PdfImageCropper
  {
    public static Rectangle FindContentBounds(Bitmap bitmap, int threshold, int padding)
    {
      Rectangle full = new Rectangle(0, 0, bitmap.Width, bitmap.Height);

      if (bitmap.Width <= 0 || bitmap.Height <= 0)
      {
        return full;
      }

      PixelFormat format = bitmap.PixelFormat;
      if (format != PixelFormat.Format24bppRgb &&
          format != PixelFormat.Format32bppArgb &&
          format != PixelFormat.Format32bppRgb &&
          format != PixelFormat.Format32bppPArgb)
      {
        using (Bitmap converted = new Bitmap(bitmap.Width, bitmap.Height, PixelFormat.Format32bppArgb))
        {
          converted.SetResolution(bitmap.HorizontalResolution, bitmap.VerticalResolution);
          using (Graphics graphics = Graphics.FromImage(converted))
          {
            graphics.Clear(Color.White);
            graphics.DrawImage(bitmap, 0, 0, bitmap.Width, bitmap.Height);
          }
          return FindContentBounds(converted, threshold, padding);
        }
      }

      BitmapData data = null;
      try
      {
        data = bitmap.LockBits(full, ImageLockMode.ReadOnly, format);
        int bytesPerPixel = Image.GetPixelFormatSize(format) / 8;
        int stride = data.Stride;
        int rowLength = Math.Abs(stride);
        byte[] bytes = new byte[rowLength * bitmap.Height];
        Marshal.Copy(data.Scan0, bytes, 0, bytes.Length);

        int left = bitmap.Width;
        int top = bitmap.Height;
        int right = -1;
        int bottom = -1;

        for (int y = 0; y < bitmap.Height; y++)
        {
          int row = stride >= 0 ? y * stride : (bitmap.Height - 1 - y) * rowLength;
          for (int x = 0; x < bitmap.Width; x++)
          {
            int index = row + (x * bytesPerPixel);
            byte blue = bytes[index];
            byte green = bytes[index + 1];
            byte red = bytes[index + 2];
            byte alpha = bytesPerPixel >= 4 ? bytes[index + 3] : (byte)255;

            if (alpha > 12 && (red < threshold || green < threshold || blue < threshold))
            {
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }
        }

        if (right < left || bottom < top)
        {
          return full;
        }

        left = Math.Max(0, left - padding);
        top = Math.Max(0, top - padding);
        right = Math.Min(bitmap.Width - 1, right + padding);
        bottom = Math.Min(bitmap.Height - 1, bottom + padding);

        return Rectangle.FromLTRB(left, top, right + 1, bottom + 1);
      }
      finally
      {
        if (data != null)
        {
          bitmap.UnlockBits(data);
        }
      }
    }
  }
}
"@
}

function New-PrintableImage {
  param(
    [Parameter(Mandatory = $true)]
    [System.Drawing.Image]$SourceImage
  )

  $bitmap = New-Object System.Drawing.Bitmap($SourceImage)
  $bitmap.SetResolution($SourceImage.HorizontalResolution, $SourceImage.VerticalResolution)

  if ($Scaling -ne "fill-page") {
    return $bitmap
  }

  $paddingPixels = [Math]::Max(24, [int]($safeDpi * 0.06))
  $cropRect = [MyPc.PdfImageCropper]::FindContentBounds($bitmap, 248, $paddingPixels)
  $fullArea = [double]($bitmap.Width * $bitmap.Height)
  $cropArea = [double]($cropRect.Width * $cropRect.Height)

  if ($cropArea -le 0 -or ($cropArea / $fullArea) -gt 0.96) {
    return $bitmap
  }

  $cropped = $bitmap.Clone($cropRect, $bitmap.PixelFormat)
  $cropped.SetResolution($bitmap.HorizontalResolution, $bitmap.VerticalResolution)
  $bitmap.Dispose()
  return $cropped
}

function Print-RenderedImage {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ImagePath
  )

  Add-Type -AssemblyName System.Drawing
  Add-PdfImageCropperType
  $sourceImage = [System.Drawing.Image]::FromFile($ImagePath)
  $image = New-PrintableImage -SourceImage $sourceImage
  $document = New-Object System.Drawing.Printing.PrintDocument
  $document.PrinterSettings.PrinterName = $PrinterName
  $document.DocumentName = [System.IO.Path]::GetFileName($FilePath)
  $document.DefaultPageSettings.Landscape = ($Orientation -eq "landscape")
  $document.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0, 0, 0, 0)

  if (-not $document.PrinterSettings.IsValid) {
    $image.Dispose()
    $sourceImage.Dispose()
    throw "Printer is not valid or unavailable: $PrinterName"
  }

  $document.add_PrintPage({
    param($sender, $event)

    $hardMarginX = [int][Math]::Ceiling($event.PageSettings.HardMarginX)
    $hardMarginY = [int][Math]::Ceiling($event.PageSettings.HardMarginY)
    $printable = $event.PageSettings.PrintableArea
    $minimumPadding = 8

    if ($Scaling -eq "shrink") {
      $bounds = $event.MarginBounds
    } else {
      $padding = if ($Scaling -eq "fill-page") { 0 } else { $minimumPadding }
      $bounds = New-Object System.Drawing.Rectangle(
        [Math]::Max(0, $hardMarginX + $padding),
        [Math]::Max(0, $hardMarginY + $padding),
        [Math]::Max(1, [int]$printable.Width - ($padding * 2)),
        [Math]::Max(1, [int]$printable.Height - ($padding * 2))
      )
    }

    if ($Scaling -eq "actual-size") {
      $width = [int]($image.Width * 100 / [Math]::Max(1, $image.HorizontalResolution) * $scaleFactor)
      $height = [int]($image.Height * 100 / [Math]::Max(1, $image.VerticalResolution) * $scaleFactor)
      $x = $bounds.X
      $y = $bounds.Y
    } else {
      $ratio = [Math]::Min($bounds.Width / $image.Width, $bounds.Height / $image.Height)
      $ratio = $ratio * $scaleFactor
      $width = [int]($image.Width * $ratio)
      $height = [int]($image.Height * $ratio)
      $x = $bounds.X + [int](($bounds.Width - $width) / 2)
      $y = $bounds.Y + [int](($bounds.Height - $height) / 2)
    }

    $event.Graphics.DrawImage($image, $x, $y, $width, $height)
    $event.HasMorePages = $false
  })

  try {
    $document.Print()
  } finally {
    $document.Dispose()
    $image.Dispose()
    $sourceImage.Dispose()
  }
}

function Send-WithGhostscriptRenderedImages {
  $ghostscriptPath = Find-Ghostscript
  if (-not $ghostscriptPath) {
    throw "Ghostscript was not found"
  }

  $renderDir = Join-Path ([System.IO.Path]::GetTempPath()) ("my-pc-pdf-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $renderDir -Force | Out-Null

  try {
    $device = if ($ColorMode -eq "grayscale") { "pnggray" } else { "png16m" }
    $outputPattern = Join-Path $renderDir "page-%04d.png"
    $arguments = @(
      "-dBATCH",
      "-dNOPAUSE",
      "-dSAFER",
      "-sDEVICE=$device",
      "-r$safeDpi",
      "-sPAPERSIZE=$($safePaperSize.ToLowerInvariant())",
      "-o",
      $outputPattern
    )

    if ($Scaling -eq "fill-page" -or $Scaling -eq "fit" -or $Scaling -eq "shrink") {
      $arguments += "-dFitPage"
    }

    $arguments += $FilePath
    & $ghostscriptPath @arguments
    if ($LASTEXITCODE -ne 0) {
      throw "Ghostscript PDF render failed with exit code $LASTEXITCODE"
    }

    $pages = @(Get-ChildItem -LiteralPath $renderDir -Filter "page-*.png" | Sort-Object Name)
    if ($pages.Count -eq 0) {
      throw "Ghostscript did not render any PDF pages"
    }

    for ($copy = 1; $copy -le $safeCopies; $copy++) {
      foreach ($page in $pages) {
        Print-RenderedImage -ImagePath $page.FullName
      }
    }
  } finally {
    Remove-Item -LiteralPath $renderDir -Recurse -Force -ErrorAction SilentlyContinue
  }
}

function Send-WithSumatra {
  if (-not (Test-Path -LiteralPath $SumatraPath)) {
    throw "SumatraPDF not found: $SumatraPath"
  }

  $sumatraSettings = @(
    "$($safeCopies)x",
    $(Convert-SumatraDuplex $DuplexMode),
    $(if ($ColorMode -eq "color") { "color" } else { "monochrome" }),
    $(Convert-SumatraScaling $Scaling)
  )

  $settings = ($sumatraSettings | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ","

  $process = Start-Process -FilePath $SumatraPath -ArgumentList @(
    "-silent",
    "-print-to",
    $PrinterName,
    "-print-settings",
    $settings,
    $FilePath
  ) -WindowStyle Hidden -Wait -PassThru

  if ($process.ExitCode -ne 0) {
    throw "SumatraPDF print failed with exit code $($process.ExitCode)"
  }
}

Apply-DriverProfile

if ($CompatibilityMode -eq "true") {
  try {
    Send-WithGhostscriptRenderedImages
    exit 0
  } catch {
    Write-Warning "Ghostscript compatibility render/print failed: $($_.Exception.Message)"
    throw
  }
}

try {
  Send-WithGhostscript
} catch {
  Write-Warning "Ghostscript direct print failed, trying SumatraPDF: $($_.Exception.Message)"
  Send-WithSumatra
}
