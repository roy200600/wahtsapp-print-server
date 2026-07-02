param(
  [switch]$Hidden,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $ProjectRoot

function Initialize-UnicodeConsole {
  try {
    $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [Console]::InputEncoding = $Utf8NoBom
    [Console]::OutputEncoding = $Utf8NoBom
    $script:OutputEncoding = $Utf8NoBom
    $OutputEncoding = $Utf8NoBom
  } catch {}

  try {
    & "$env:SystemRoot\System32\chcp.com" 65001 | Out-Null
  } catch {}
}

function Invoke-Checked($FilePath, [string[]]$Arguments) {
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code $LASTEXITCODE`: $FilePath $($Arguments -join ' ')"
  }
}

function Enable-PortableNodePath($ProjectRoot, $NodeExe) {
  $NodeDir = Split-Path -Parent $NodeExe
  $ShimDir = Join-Path $ProjectRoot "runtime\bin"
  $ShimPath = Join-Path $ShimDir "node.cmd"
  if (Test-Path $ShimPath) {
    Remove-Item -LiteralPath $ShimPath -Force -ErrorAction SilentlyContinue
  }

  $ExistingPath = (($env:Path -split ";") |
    Where-Object { $_ -and ([string]::Compare($_, $ShimDir, $true) -ne 0) }) -join ";"
  $env:Path = "$NodeDir;$ExistingPath"
  $env:npm_node_execpath = $NodeExe
  $env:NODE = $NodeExe
  $env:npm_config_unicode = "true"
}

function Get-NodeExe() {
  $RuntimeNode = Join-Path $ProjectRoot "runtime\node\node.exe"
  if (Test-Path $RuntimeNode) {
    return $RuntimeNode
  }

  $Command = Get-Command "node.exe" -ErrorAction SilentlyContinue
  if ($Command) {
    return $Command.Source
  }

  throw "Node.js was not found. Run scripts\install-windows.ps1 first."
}

function Get-NpmCmd() {
  $RuntimeNpm = Join-Path $ProjectRoot "runtime\node\npm.cmd"
  if (Test-Path $RuntimeNpm) {
    return $RuntimeNpm
  }

  $Command = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($Command) {
    return $Command.Source
  }

  throw "npm was not found. Run scripts\install-windows.ps1 first."
}

function Initialize-SumatraPdf($ProjectRoot) {
  $SumatraDir = Join-Path $ProjectRoot "tools\SumatraPDF"
  $SumatraExe = Join-Path $SumatraDir "SumatraPDF.exe"
  if (Test-Path $SumatraExe) {
    return
  }

  Write-Host "SumatraPDF was not found. Downloading portable SumatraPDF..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  New-Item -ItemType Directory -Force -Path $SumatraDir | Out-Null
  $SumatraZip = Join-Path $env:TEMP "SumatraPDF-3.6.1-64.zip"
  $ExtractRoot = Join-Path $env:TEMP "my-pc-sumatrapdf"
  if (Test-Path $ExtractRoot) {
    Remove-Item -LiteralPath $ExtractRoot -Recurse -Force
  }
  Invoke-WebRequest -Uri "https://www.sumatrapdfreader.org/dl/rel/3.6.1/SumatraPDF-3.6.1-64.zip" -OutFile $SumatraZip
  Expand-Archive -Path $SumatraZip -DestinationPath $ExtractRoot -Force
  $DownloadedExe = Get-ChildItem $ExtractRoot -Recurse -Filter "*.exe" |
    Where-Object { $_.Name -like "SumatraPDF*.exe" } |
    Select-Object -First 1
  if (-not $DownloadedExe) {
    $ExtractedFiles = (Get-ChildItem $ExtractRoot -Recurse | Select-Object -ExpandProperty Name) -join ", "
    throw "Could not extract SumatraPDF executable from the portable package. Extracted files: $ExtractedFiles"
  }
  Copy-Item -LiteralPath $DownloadedExe.FullName -Destination $SumatraExe -Force
}

Initialize-UnicodeConsole

$NodeExe = Get-NodeExe
$NpmCmd = Get-NpmCmd
Enable-PortableNodePath $ProjectRoot $NodeExe

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  if (Test-Path "package-lock.json") {
    Invoke-Checked $NpmCmd @("ci")
  } else {
    Invoke-Checked $NpmCmd @("install")
  }
}

if (-not (Test-Path "dist\main.js")) {
  Write-Host "Building project..."
  Invoke-Checked $NpmCmd @("run", "build")
}

foreach ($dir in @("auth", "config", "data", "downloads", "printed", "failed", "logs", "temp", "tools")) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Initialize-SumatraPdf $ProjectRoot

if (-not (Test-Path "config\settings.json") -and (Test-Path "config\settings.example.json")) {
  Copy-Item "config\settings.example.json" "config\settings.json"
}

if ($Hidden) {
  Start-Process -FilePath $NodeExe -ArgumentList @("dist/main.js") -WorkingDirectory $ProjectRoot -WindowStyle Hidden
  if ($OpenBrowser) {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3010"
  }
  Write-Host "MY-PC WhatsApp Print Server started in background: http://localhost:3010"
} else {
  Write-Host "MY-PC WhatsApp Print Server starting: http://localhost:3010"
  if ($OpenBrowser) {
    Start-Process "http://localhost:3010"
  }
  & $NodeExe dist/main.js
}
