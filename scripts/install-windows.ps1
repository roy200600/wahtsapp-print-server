param(
  [string]$InstallDir = "$env:LOCALAPPDATA\MY-PC\WhatsAppPrintServer",
  [string]$RepoZipUrl = "https://github.com/roy200600/wahtsapp-print-server/archive/refs/heads/main.zip",
  [switch]$NoStartup,
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"

function Require-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $InstallHint"
  }
}

Require-Command "node.exe" "Install Node.js LTS from https://nodejs.org/"
Require-Command "npm.cmd" "Install Node.js LTS from https://nodejs.org/"

$CurrentRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$UseCurrentFolder = Test-Path (Join-Path $CurrentRoot "package.json")

if ($UseCurrentFolder) {
  $ProjectRoot = $CurrentRoot
} else {
  $ProjectRoot = $InstallDir
  New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
  $TempZip = Join-Path $env:TEMP "whatsapp-print-server.zip"
  $ExtractRoot = Join-Path $env:TEMP "whatsapp-print-server-src"

  if (Test-Path $ExtractRoot) {
    Remove-Item -LiteralPath $ExtractRoot -Recurse -Force
  }

  Write-Host "Downloading project..."
  Invoke-WebRequest -Uri $RepoZipUrl -OutFile $TempZip
  Expand-Archive -Path $TempZip -DestinationPath $ExtractRoot -Force

  $Source = Get-ChildItem $ExtractRoot -Directory | Select-Object -First 1
  if (-not $Source) {
    throw "Could not find extracted project folder."
  }

  Copy-Item -Path (Join-Path $Source.FullName "*") -Destination $InstallDir -Recurse -Force
}

Set-Location -LiteralPath $ProjectRoot

foreach ($dir in @("auth", "config", "data", "downloads", "printed", "failed", "logs", "temp", "tools")) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

if (-not (Test-Path "config\settings.json") -and (Test-Path "config\settings.example.json")) {
  Copy-Item "config\settings.example.json" "config\settings.json"
}

Write-Host "Installing dependencies..."
if (Test-Path "package-lock.json") {
  npm ci
} else {
  npm install
}

Write-Host "Building project..."
npm run build

if (-not $NoStartup) {
  $StartupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  New-Item -ItemType Directory -Force -Path $StartupDir | Out-Null
  $ShortcutPath = Join-Path $StartupDir "MY-PC WhatsApp Print Server.lnk"
  $PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  $StartScript = Join-Path $ProjectRoot "scripts\start-windows.ps1"
  $Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`" -Hidden"

  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $PowerShellPath
  $Shortcut.Arguments = $Arguments
  $Shortcut.WorkingDirectory = $ProjectRoot
  $Shortcut.WindowStyle = 7
  $Shortcut.Save()
  Write-Host "Startup shortcut created: $ShortcutPath"
}

if (-not $NoStart) {
  & ".\scripts\start-windows.ps1" -Hidden
}

Write-Host ""
Write-Host "Installation complete."
Write-Host "Open: http://localhost:3010"
Write-Host "First setup: choose admin password, scan WhatsApp QR, select printer, save settings."
