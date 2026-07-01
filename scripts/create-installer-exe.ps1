param(
  [string]$OutputDir = "$PSScriptRoot\..\release",
  [string]$InstallerName = "MY-PC-WhatsApp-Print-Server-Setup.exe",
  [string]$InstallCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ""irm https://raw.githubusercontent.com/roy200600/wahtsapp-print-server/main/scripts/install-windows.ps1 | iex"""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$OutputDir = (Resolve-Path (New-Item -ItemType Directory -Force -Path $OutputDir)).Path
$StubDir = Join-Path $env:TEMP "my-pc-installer-stub"
$StubBat = Join-Path $StubDir "install-my-pc-whatsapp-print-server.bat"
$SedPath = Join-Path $env:TEMP "my-pc-whatsapp-print-server.sed"
$OutputExe = Join-Path $OutputDir $InstallerName

if (Test-Path $StubDir) {
  Remove-Item -LiteralPath $StubDir -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $StubDir | Out-Null

Set-Content -Path $StubBat -Encoding ASCII -Value @(
  "@echo off",
  "echo Installing MY-PC WhatsApp Print Server...",
  $InstallCommand,
  "pause"
)

$Sed = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=1
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=Installation started.
TargetName=$OutputExe
FriendlyName=MY-PC WhatsApp Print Server Setup
AppLaunched=cmd.exe /c install-my-pc-whatsapp-print-server.bat
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[Strings]
FILE0=install-my-pc-whatsapp-print-server.bat
[SourceFiles]
SourceFiles0=$StubDir
[SourceFiles0]
%FILE0%=
"@

Set-Content -Path $SedPath -Encoding ASCII -Value $Sed
$IExpress = Join-Path $env:SystemRoot "System32\iexpress.exe"
if (-not (Test-Path $IExpress)) {
  throw "iexpress.exe was not found on this Windows installation."
}

Start-Process -FilePath $IExpress -ArgumentList @("/N", "/Q", $SedPath) -Wait -NoNewWindow
if (-not (Test-Path $OutputExe)) {
  throw "Installer EXE was not created."
}

Write-Host "Installer created: $OutputExe"
