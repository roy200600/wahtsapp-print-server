param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [Parameter(Mandatory = $true)]
  [string]$SumatraPath,

  [int]$Copies = 1,
  [string]$Duplex = "false",
  [string]$Color = "true"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "PDF file not found: $FilePath"
}

if (-not (Test-Path -LiteralPath $SumatraPath)) {
  throw "SumatraPDF not found: $SumatraPath"
}

$printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $printer) {
  throw "Printer not found: $PrinterName"
}

$settings = @(
  "$([Math]::Max(1, $Copies))x",
  $(if ($Duplex -eq "true") { "duplex" } else { "simplex" }),
  $(if ($Color -eq "true") { "color" } else { "monochrome" })
) -join ","

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
