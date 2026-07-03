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

  [string]$PaperSize = "A4",

  [ValidateSet("fill-page", "fit", "actual-size", "shrink")]
  [string]$Scaling = "fit",

  [int]$ScalePercent = 100,

  [int]$Copies = 1,
  [int]$Dpi = 600,

  [ValidateSet("draft", "normal", "high")]
  [string]$Quality = "high",

  [string]$CompatibilityMode = "true",

  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "PowerPoint file not found: $FilePath"
}

if ($DryRun) {
  [pscustomobject]@{
    ok = $true
    filePath = (Resolve-Path -LiteralPath $FilePath).Path
    printerName = $PrinterName
    sumatraPath = $SumatraPath
    colorMode = $ColorMode
    duplexMode = $DuplexMode
    paperSize = $PaperSize
    scaling = $Scaling
    scalePercent = $ScalePercent
    copies = [Math]::Max(1, $Copies)
    dpi = $Dpi
    quality = $Quality
    compatibilityMode = $CompatibilityMode
    engine = "PowerPoint.Application -> PDF profile"
  } | ConvertTo-Json -Depth 5
  exit 0
}

$printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $printer) {
  throw "Printer not found: $PrinterName"
}

$powerPoint = $null
$presentation = $null
$tempFilePath = Join-Path ([System.IO.Path]::GetTempPath()) ("whatsapp-print-powerpoint-" + [guid]::NewGuid().ToString() + [System.IO.Path]::GetExtension($FilePath))
$tempPdfPath = Join-Path ([System.IO.Path]::GetTempPath()) ("whatsapp-print-powerpoint-" + [guid]::NewGuid().ToString() + ".pdf")

try {
  Copy-Item -LiteralPath $FilePath -Destination $tempFilePath -Force

  $powerPoint = New-Object -ComObject PowerPoint.Application
  $presentation = $powerPoint.Presentations.Open($tempFilePath, $false, $false, $false)
  $presentation.PageSetup.SlideOrientation = 1
  $presentation.SaveAs($tempPdfPath, 32)

  if (-not (Test-Path -LiteralPath $tempPdfPath)) {
    throw "PowerPoint PDF export failed"
  }

  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "print-pdf-profile.ps1") `
    -FilePath $tempPdfPath `
    -PrinterName $PrinterName `
    -SumatraPath $SumatraPath `
    -ColorMode $ColorMode `
    -DuplexMode $DuplexMode `
    -Orientation "landscape" `
    -PaperSize $PaperSize `
    -Scaling $Scaling `
    -ScalePercent $ScalePercent `
    -Copies $Copies `
    -Dpi $Dpi `
    -Quality $Quality `
    -CompatibilityMode $CompatibilityMode

  if ($LASTEXITCODE -ne 0) {
    throw "PowerPoint PDF print failed with exit code $LASTEXITCODE"
  }
} finally {
  if ($presentation) {
    $presentation.Close()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation)
  }
  if ($powerPoint) {
    $powerPoint.Quit()
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint)
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  if (Test-Path -LiteralPath $tempFilePath) {
    Remove-Item -LiteralPath $tempFilePath -Force -ErrorAction SilentlyContinue
  }
  if (Test-Path -LiteralPath $tempPdfPath) {
    Remove-Item -LiteralPath $tempPdfPath -Force -ErrorAction SilentlyContinue
  }
}
