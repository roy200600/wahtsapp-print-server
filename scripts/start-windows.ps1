param(
  [switch]$Hidden,
  [switch]$OpenBrowser
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Set-Location -LiteralPath $ProjectRoot

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  if (Test-Path "package-lock.json") {
    npm ci
  } else {
    npm install
  }
}

if (-not (Test-Path "dist\main.js")) {
  Write-Host "Building project..."
  npm run build
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
  Start-Process -FilePath "node.exe" -ArgumentList @("dist/main.js") -WorkingDirectory $ProjectRoot -WindowStyle Hidden
  Write-Host "MY-PC WhatsApp Print Server started in background: http://localhost:3010"
} else {
  Write-Host "MY-PC WhatsApp Print Server starting: http://localhost:3010"
  node dist/main.js
}
