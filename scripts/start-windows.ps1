param(
  [switch]$Hidden,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $ProjectRoot

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

$NodeExe = Get-NodeExe
$NpmCmd = Get-NpmCmd
$NodeDir = Split-Path -Parent $NodeExe
$env:Path = "$NodeDir;$env:Path"

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  if (Test-Path "package-lock.json") {
    & $NpmCmd ci
  } else {
    & $NpmCmd install
  }
}

if (-not (Test-Path "dist\main.js")) {
  Write-Host "Building project..."
  & $NpmCmd run build
}

foreach ($dir in @("auth", "config", "data", "downloads", "printed", "failed", "logs", "temp", "tools")) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

if (-not (Test-Path "config\settings.json") -and (Test-Path "config\settings.example.json")) {
  Copy-Item "config\settings.example.json" "config\settings.json"
}

if ($OpenBrowser) {
  Start-Process "http://localhost:3010"
}

if ($Hidden) {
  Start-Process -FilePath $NodeExe -ArgumentList @("dist/main.js") -WorkingDirectory $ProjectRoot -WindowStyle Hidden
  Write-Host "MY-PC WhatsApp Print Server started in background: http://localhost:3010"
} else {
  Write-Host "MY-PC WhatsApp Print Server starting: http://localhost:3010"
  & $NodeExe dist/main.js
}
