param(
  [string]$InstallDir = "$env:LOCALAPPDATA\MY-PC\WhatsAppPrintServer",
  [string]$RepoZipUrl = "https://github.com/roy200600/wahtsapp-print-server/archive/refs/heads/main.zip",
  [switch]$NoStartup,
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"

function Initialize-NodeRuntime($ProjectRoot) {
  $NodeCommand = Get-Command "node.exe" -ErrorAction SilentlyContinue
  $NpmCommand = Get-Command "npm.cmd" -ErrorAction SilentlyContinue

  if ($NodeCommand -and $NpmCommand) {
    $script:NodeExe = $NodeCommand.Source
    $script:NpmCmd = $NpmCommand.Source
    Write-Host "Using installed Node.js: $($script:NodeExe)"
    return
  }

  $RuntimeRoot = Join-Path $ProjectRoot "runtime\node"
  $RuntimeNode = Join-Path $RuntimeRoot "node.exe"
  $RuntimeNpm = Join-Path $RuntimeRoot "npm.cmd"

  if ((Test-Path $RuntimeNode) -and (Test-Path $RuntimeNpm)) {
    $script:NodeExe = $RuntimeNode
    $script:NpmCmd = $RuntimeNpm
    Write-Host "Using bundled Node.js: $RuntimeNode"
    return
  }

  Write-Host "Node.js was not found. Downloading portable Node.js runtime..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  $RuntimeParent = Join-Path $ProjectRoot "runtime"
  $ExtractRoot = Join-Path $env:TEMP "my-pc-node-runtime"
  $NodeZip = Join-Path $env:TEMP "node-win-x64.zip"
  New-Item -ItemType Directory -Force -Path $RuntimeParent | Out-Null

  if (Test-Path $ExtractRoot) {
    Remove-Item -LiteralPath $ExtractRoot -Recurse -Force
  }

  $Index = Invoke-RestMethod "https://nodejs.org/dist/index.json"
  $Version = $Index | Where-Object { $_.lts -and ($_.files -contains "win-x64-zip") } | Select-Object -First 1
  if (-not $Version) {
    throw "Could not find a Windows x64 Node.js LTS download."
  }

  $ZipUrl = "https://nodejs.org/dist/$($Version.version)/node-$($Version.version)-win-x64.zip"
  Invoke-WebRequest -Uri $ZipUrl -OutFile $NodeZip
  Expand-Archive -Path $NodeZip -DestinationPath $ExtractRoot -Force

  $ExtractedNode = Get-ChildItem $ExtractRoot -Directory | Where-Object { $_.Name -like "node-*-win-x64" } | Select-Object -First 1
  if (-not $ExtractedNode) {
    throw "Could not extract portable Node.js runtime."
  }

  if (Test-Path $RuntimeRoot) {
    Remove-Item -LiteralPath $RuntimeRoot -Recurse -Force
  }

  New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null
  Copy-Item -Path (Join-Path $ExtractedNode.FullName "*") -Destination $RuntimeRoot -Recurse -Force

  $script:NodeExe = $RuntimeNode
  $script:NpmCmd = $RuntimeNpm
  Write-Host "Bundled Node.js installed: $RuntimeNode"
}

$CurrentRoot = ""
$UseCurrentFolder = $false

if (-not [string]::IsNullOrWhiteSpace($PSScriptRoot)) {
  $CandidateRoot = Join-Path $PSScriptRoot ".."
  if (Test-Path $CandidateRoot) {
    $CurrentRoot = (Resolve-Path $CandidateRoot).Path
    $UseCurrentFolder = Test-Path (Join-Path $CurrentRoot "package.json")
  }
}

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

Initialize-NodeRuntime $ProjectRoot

foreach ($dir in @("auth", "config", "data", "downloads", "printed", "failed", "logs", "temp", "tools", "runtime")) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

if (-not (Test-Path "config\settings.json") -and (Test-Path "config\settings.example.json")) {
  Copy-Item "config\settings.example.json" "config\settings.json"
}

Write-Host "Installing dependencies..."
if (Test-Path "package-lock.json") {
  & $script:NpmCmd ci
} else {
  & $script:NpmCmd install
}

Write-Host "Building project..."
& $script:NpmCmd run build

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
  $StartScript = Join-Path $ProjectRoot "scripts\start-windows.ps1"
  $PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  Start-Process -FilePath $PowerShellPath -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-WindowStyle",
    "Hidden",
    "-File",
    $StartScript,
    "-Hidden"
  ) -WorkingDirectory $ProjectRoot -WindowStyle Hidden
}

Write-Host ""
Write-Host "Installation complete."
Write-Host "Open: http://localhost:3010"
Write-Host "First setup: choose admin password, scan WhatsApp QR, select printer, save settings."
