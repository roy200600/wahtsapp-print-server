param(
  [string]$InstallDir = "$env:LOCALAPPDATA\MY-PC\WhatsAppPrintServer",
  [string]$RepoZipUrl = "https://github.com/roy200600/wahtsapp-print-server/archive/refs/heads/main.zip",
  [switch]$EnableStartup,
  [switch]$NoStartup,
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"

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
  $WindowsPaths = @(
    (Join-Path $env:SystemRoot "System32"),
    (Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0"),
    (Join-Path $env:SystemRoot "System32\Wbem")
  ) | Where-Object { $_ -and (Test-Path $_) }
  $env:Path = (@($NodeDir) + $WindowsPaths + @($ExistingPath)) -join ";"
  $env:npm_node_execpath = $NodeExe
  $env:NODE = $NodeExe
  $env:npm_config_unicode = "true"
}

$MinimumNodeVersion = [version]"22.13.0"

function Test-NodeVersion($NodeExe) {
  try {
    $VersionText = (& $NodeExe -p "process.versions.node").Trim()
    return ([version]$VersionText -ge $MinimumNodeVersion)
  } catch {
    return $false
  }
}

function Initialize-NodeRuntime($ProjectRoot) {
  $NodeCommand = Get-Command "node.exe" -ErrorAction SilentlyContinue
  $NpmCommand = Get-Command "npm.cmd" -ErrorAction SilentlyContinue

  if ($NodeCommand -and $NpmCommand) {
    if (Test-NodeVersion $NodeCommand.Source) {
      $script:NodeExe = $NodeCommand.Source
      $script:NpmCmd = $NpmCommand.Source
      Write-Host "Using installed Node.js: $($script:NodeExe)"
      return
    }

    Write-Host "Installed Node.js is older than $MinimumNodeVersion. Using portable runtime instead."
  }

  $RuntimeRoot = Join-Path $ProjectRoot "runtime\node"
  $RuntimeNode = Join-Path $RuntimeRoot "node.exe"
  $RuntimeNpm = Join-Path $RuntimeRoot "npm.cmd"

  if ((Test-Path $RuntimeNode) -and (Test-Path $RuntimeNpm) -and (Test-NodeVersion $RuntimeNode)) {
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
  try {
    Invoke-WebRequest -Uri $ZipUrl -OutFile $NodeZip
  } catch {
    $FallbackVersion = "v22.13.1"
    $FallbackUrl = "https://nodejs.org/dist/$FallbackVersion/node-$FallbackVersion-win-x64.zip"
    Write-Host "Primary Node.js download failed: $ZipUrl"
    Write-Host "Trying fallback Node.js runtime: $FallbackUrl"
    Invoke-WebRequest -Uri $FallbackUrl -OutFile $NodeZip
  }
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

function Initialize-SumatraPdf($ProjectRoot) {
  $SumatraDir = Join-Path $ProjectRoot "tools\SumatraPDF"
  $SumatraExe = Join-Path $SumatraDir "SumatraPDF.exe"
  if (Test-Path $SumatraExe) {
    Write-Host "Using bundled SumatraPDF: $SumatraExe"
    return
  }

  Write-Host "SumatraPDF was not found. Downloading portable SumatraPDF..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  New-Item -ItemType Directory -Force -Path $SumatraDir | Out-Null

  $SumatraUrl = "https://www.sumatrapdfreader.org/dl/rel/3.6.1/SumatraPDF-3.6.1-64.zip"
  $SumatraTempDir = Join-Path $env:TEMP ("my-pc-sumatrapdf-" + [System.Guid]::NewGuid().ToString("N"))
  $SumatraZip = Join-Path $SumatraTempDir "SumatraPDF-3.6.1-64.zip"
  $ExtractRoot = Join-Path $SumatraTempDir "extract"
  New-Item -ItemType Directory -Force -Path $SumatraTempDir | Out-Null

  try {
    Invoke-WebRequest -Uri $SumatraUrl -OutFile $SumatraZip
    Expand-Archive -Path $SumatraZip -DestinationPath $ExtractRoot -Force

    $DownloadedExe = Get-ChildItem $ExtractRoot -Recurse -Filter "*.exe" |
      Where-Object { $_.Name -like "SumatraPDF*.exe" } |
      Select-Object -First 1
    if (-not $DownloadedExe) {
      $ExtractedFiles = (Get-ChildItem $ExtractRoot -Recurse | Select-Object -ExpandProperty Name) -join ", "
      throw "Could not extract SumatraPDF executable from the portable package. Extracted files: $ExtractedFiles"
    }

    Copy-Item -LiteralPath $DownloadedExe.FullName -Destination $SumatraExe -Force
    Write-Host "SumatraPDF installed: $SumatraExe"
  } finally {
    if ($SumatraTempDir -and (Test-Path -LiteralPath $SumatraTempDir)) {
      Remove-Item -LiteralPath $SumatraTempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Initialize-Ghostscript($ProjectRoot) {
  $GhostscriptRoot = Join-Path $ProjectRoot "tools\Ghostscript"
  $Existing = Get-ChildItem -Path (Join-Path $GhostscriptRoot "*\bin\gswin64c.exe") -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $Existing) {
    $Existing = Get-ChildItem -Path (Join-Path $GhostscriptRoot "bin\gswin64c.exe") -ErrorAction SilentlyContinue |
      Select-Object -First 1
  }
  if ($Existing) {
    Write-Host "Using bundled Ghostscript: $($Existing.FullName)"
    return
  }

  $SystemGhostscript = Get-Command "gswin64c.exe" -ErrorAction SilentlyContinue
  if ($SystemGhostscript) {
    Write-Host "Using installed Ghostscript: $($SystemGhostscript.Source)"
    return
  }
  $SystemGhostscript = Get-ChildItem -Path @(
    "C:\Program Files\gs\*\bin\gswin64c.exe",
    "C:\Program Files (x86)\gs\*\bin\gswin32c.exe"
  ) -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
  if ($SystemGhostscript) {
    Write-Host "Using installed Ghostscript: $($SystemGhostscript.FullName)"
    return
  }

  Write-Host "Ghostscript was not found. Downloading portable local Ghostscript runtime..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  New-Item -ItemType Directory -Force -Path $GhostscriptRoot | Out-Null

  $GhostscriptVersion = "10.07.1"
  $GhostscriptTag = "gs10071"
  $InstallerName = "gs10071w64.exe"
  $InstallerUrl = "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/$GhostscriptTag/$InstallerName"
  $InstallerTempDir = Join-Path $env:TEMP ("my-pc-ghostscript-" + [System.Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $InstallerTempDir | Out-Null
  $InstallerPath = Join-Path $InstallerTempDir $InstallerName
  $InstallPath = Join-Path $GhostscriptRoot "gs$($GhostscriptVersion)"

  try {
    Invoke-WebRequest -Uri $InstallerUrl -OutFile $InstallerPath
    $process = Start-Process -FilePath $InstallerPath -ArgumentList @("/S", "/D=$InstallPath") -Wait -PassThru -WindowStyle Hidden
    if ($process.ExitCode -ne 0) {
      Write-Warning "Ghostscript installer failed with exit code $($process.ExitCode). PDF compatibility mode will fall back to SumatraPDF."
      return
    }

    $InstalledExe = Get-ChildItem -Path (Join-Path $GhostscriptRoot "*\bin\gswin64c.exe") -ErrorAction SilentlyContinue |
      Select-Object -First 1
    if (-not $InstalledExe) {
      Write-Warning "Ghostscript was downloaded but gswin64c.exe was not found under $GhostscriptRoot. PDF compatibility mode will fall back to SumatraPDF."
      return
    }

    Write-Host "Ghostscript installed: $($InstalledExe.FullName)"
  } catch {
    Write-Warning "Ghostscript setup failed: $($_.Exception.Message). PDF compatibility mode will fall back to SumatraPDF."
  } finally {
    if ($InstallerTempDir -and (Test-Path -LiteralPath $InstallerTempDir)) {
      Remove-Item -LiteralPath $InstallerTempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

function Initialize-TeamViewerQuickSupport($ProjectRoot) {
  $TeamViewerDir = Join-Path $ProjectRoot "tools\TeamViewerQS"
  $TeamViewerExe = Join-Path $TeamViewerDir "TeamViewerQS.exe"
  if (Test-Path $TeamViewerExe) {
    Write-Host "Using bundled TeamViewer QS: $TeamViewerExe"
    return
  }

  Write-Host "TeamViewer QS was not found. Downloading portable TeamViewer QuickSupport..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  New-Item -ItemType Directory -Force -Path $TeamViewerDir | Out-Null

  $DownloadUrls = @(
    "https://download.teamviewer.com/download/TeamViewerQS.exe"
  )

  $LastError = $null
  foreach ($Url in $DownloadUrls) {
    try {
      Invoke-WebRequest -Uri $Url -OutFile $TeamViewerExe
      if ((Test-Path $TeamViewerExe) -and ((Get-Item $TeamViewerExe).Length -gt 1024KB)) {
        Write-Host "TeamViewer QS installed: $TeamViewerExe"
        return
      }
      Remove-Item -LiteralPath $TeamViewerExe -Force -ErrorAction SilentlyContinue
    } catch {
      $LastError = $_.Exception.Message
    }
  }

  Write-Warning "TeamViewer QS download failed. Remote support command will report that QS is missing. Last error: $LastError"
}

function New-AppShortcut($ProjectRoot, $ShortcutPath) {
  $PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  $StartScript = Join-Path $ProjectRoot "scripts\start-windows.ps1"
  $Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$StartScript`" -Hidden -OpenBrowser"
  $ShortcutDir = Split-Path -Parent $ShortcutPath

  if (-not [string]::IsNullOrWhiteSpace($ShortcutDir)) {
    New-Item -ItemType Directory -Force -Path $ShortcutDir | Out-Null
  }

  $Shell = New-Object -ComObject WScript.Shell
  $Shortcut = $Shell.CreateShortcut($ShortcutPath)
  $Shortcut.TargetPath = $PowerShellPath
  $Shortcut.Arguments = $Arguments
  $Shortcut.WorkingDirectory = [string]$ProjectRoot
  $Shortcut.WindowStyle = 7
  $Shortcut.Save()
}

function Get-DesktopFolders {
  $Candidates = @(
    [Environment]::GetFolderPath("DesktopDirectory"),
    [Environment]::GetFolderPath("Desktop"),
    (Join-Path $env:USERPROFILE "Desktop"),
    (Join-Path $env:PUBLIC "Desktop")
  )

  $Candidates |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) } |
    Select-Object -Unique
}

function New-DesktopShortcut($ProjectRoot) {
  $ShortcutName = "MY-PC WhatsApp Print Server.lnk"
  $LastError = $null

  foreach ($DesktopDir in Get-DesktopFolders) {
    try {
      $DesktopShortcut = Join-Path $DesktopDir $ShortcutName
      New-AppShortcut $ProjectRoot $DesktopShortcut
      Write-Host "Desktop shortcut created: $DesktopShortcut"
      return
    } catch {
      $LastError = $_.Exception.Message
      Write-Warning "Could not create desktop shortcut in $DesktopDir. Trying another desktop folder..."
    }
  }

  Write-Warning "Desktop shortcut was not created. Installation will continue. Last error: $LastError"
}

Initialize-UnicodeConsole

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

Write-Host "Stopping existing server if it is running..."
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and
    ($_.CommandLine -like "*dist/main.js*" -or $_.CommandLine -like "*WhatsAppPrintServer*")
  } |
  ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }

Initialize-NodeRuntime $ProjectRoot
Enable-PortableNodePath $ProjectRoot $script:NodeExe

foreach ($dir in @("auth", "config", "data", "downloads", "printed", "failed", "logs", "temp", "tools", "runtime")) {
  New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

Initialize-SumatraPdf $ProjectRoot
Initialize-Ghostscript $ProjectRoot
Initialize-TeamViewerQuickSupport $ProjectRoot

if (-not (Test-Path "config\settings.json") -and (Test-Path "config\settings.example.json")) {
  Copy-Item "config\settings.example.json" "config\settings.json"
}

Write-Host "Installing dependencies..."
if (Test-Path "package-lock.json") {
  Invoke-Checked $script:NpmCmd @("ci")
} else {
  Invoke-Checked $script:NpmCmd @("install")
}

Write-Host "Building project..."
Invoke-Checked $script:NpmCmd @("run", "build")

New-DesktopShortcut $ProjectRoot

if ($EnableStartup -and -not $NoStartup) {
  $StartupDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
  New-Item -ItemType Directory -Force -Path $StartupDir | Out-Null
  $ShortcutPath = Join-Path $StartupDir "MY-PC WhatsApp Print Server.lnk"
  try {
    New-AppShortcut $ProjectRoot $ShortcutPath
    Write-Host "Startup shortcut created: $ShortcutPath"
  } catch {
    Write-Warning "Startup shortcut was not created. Installation will continue. Error: $($_.Exception.Message)"
  }
} else {
  $StartupShortcutPath = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\MY-PC WhatsApp Print Server.lnk"
  if (Test-Path $StartupShortcutPath) {
    Remove-Item -LiteralPath $StartupShortcutPath -Force
    Write-Host "Startup shortcut removed for trial/default installation."
  }
}

if (-not $NoStart) {
  $StartScript = Join-Path $ProjectRoot "scripts\start-windows.ps1"
  $QuotedStartScript = '"' + $StartScript + '"'
  $PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  Start-Process -FilePath $PowerShellPath -ArgumentList @(
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-WindowStyle",
    "Hidden",
    "-File",
    $QuotedStartScript,
    "-Hidden"
  ) -WorkingDirectory $ProjectRoot -WindowStyle Hidden
}

Write-Host ""
Write-Host "Installation complete."
Write-Host "Open: http://localhost:3010"
Write-Host "First setup: choose admin password, scan WhatsApp QR, select printer, save settings."
