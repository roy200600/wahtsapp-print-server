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

if (-not [System.IO.Path]::IsPathRooted($SumatraPath)) {
  $ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
  $CandidateSumatraPath = Join-Path $ProjectRoot $SumatraPath
  if (Test-Path -LiteralPath $CandidateSumatraPath) {
    $SumatraPath = $CandidateSumatraPath
  }
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

function ConvertTo-ProcessArgument {
  param([AllowNull()][string]$Argument)

  if ($null -eq $Argument -or $Argument.Length -eq 0) {
    return '""'
  }

  if ($Argument -notmatch '[\s"]') {
    return $Argument
  }

  $escaped = $Argument -replace '(\\*)"', '$1$1\"'
  $escaped = $escaped -replace '(\\+)$', '$1$1'
  return '"' + $escaped + '"'
}

function Join-ProcessArguments {
  param([string[]]$Arguments)
  return ($Arguments | ForEach-Object { ConvertTo-ProcessArgument ([string]$_) }) -join " "
}

function Invoke-NativeProcess {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FileName,

    [string[]]$Arguments = @()
  )

  $startInfo = New-Object System.Diagnostics.ProcessStartInfo
  $startInfo.FileName = $FileName
  $startInfo.Arguments = Join-ProcessArguments $Arguments
  $startInfo.WorkingDirectory = Split-Path -Parent $FileName
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $startInfo

  try {
    [void]$process.Start()
    $process.WaitForExit()
    return $process.ExitCode
  } finally {
    $process.Dispose()
  }
}

function New-SumatraSafePdfCopy {
  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ("my-pc-sumatra-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
  $tempFile = Join-Path $tempDir "document.pdf"
  Copy-Item -LiteralPath $FilePath -Destination $tempFile -Force

  return [pscustomobject]@{
    Directory = $tempDir
    FilePath = $tempFile
  }
}

$safePdf = New-SumatraSafePdfCopy

try {
  $exitCode = Invoke-NativeProcess -FileName $SumatraPath -Arguments @(
    "-silent",
    "-print-to",
    $PrinterName,
    "-print-settings",
    $settings,
    $safePdf.FilePath
  )

  if ($exitCode -ne 0) {
    throw "SumatraPDF print failed with exit code $exitCode. Printer: $PrinterName. Settings: $settings"
  }
} finally {
  Remove-Item -LiteralPath $safePdf.Directory -Recurse -Force -ErrorAction SilentlyContinue
}
