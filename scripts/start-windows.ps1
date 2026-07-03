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

$MinimumNodeVersion = [version]"22.13.0"

function Test-NodeVersion($NodeExe) {
  try {
    $VersionText = (& $NodeExe -p "process.versions.node").Trim()
    return ([version]$VersionText -ge $MinimumNodeVersion)
  } catch {
    return $false
  }
}

function Get-NodeExe() {
  $RuntimeNode = Join-Path $ProjectRoot "runtime\node\node.exe"
  if ((Test-Path $RuntimeNode) -and (Test-NodeVersion $RuntimeNode)) {
    return $RuntimeNode
  }

  $Command = Get-Command "node.exe" -ErrorAction SilentlyContinue
  if ($Command -and (Test-NodeVersion $Command.Source)) {
    return $Command.Source
  }

  throw "Node.js $MinimumNodeVersion or newer was not found. Run scripts\install-windows.ps1 first."
}

function Get-NpmCmd() {
  $RuntimeNode = Join-Path $ProjectRoot "runtime\node\node.exe"
  $RuntimeNpm = Join-Path $ProjectRoot "runtime\node\npm.cmd"
  if ((Test-Path $RuntimeNpm) -and (Test-Path $RuntimeNode) -and (Test-NodeVersion $RuntimeNode)) {
    return $RuntimeNpm
  }

  $Command = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($Command) {
    return $Command.Source
  }

  throw "npm was not found. Run scripts\install-windows.ps1 first."
}

function Get-ConfiguredPort() {
  $SettingsPath = Join-Path $ProjectRoot "config\settings.json"
  if (Test-Path $SettingsPath) {
    try {
      $Settings = Get-Content -LiteralPath $SettingsPath -Raw | ConvertFrom-Json
      if ($Settings.port) {
        return [int]$Settings.port
      }
    } catch {}
  }

  return 3010
}

function Test-ServerRunning($Port) {
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/status" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Get-RunningServerStatus($Port) {
  try {
    return Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/status" -TimeoutSec 2
  } catch {
    return $null
  }
}

function Test-RunningServerDiagnostics($Port) {
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:$Port/api/diagnostics/print-engines" -TimeoutSec 2 | Out-Null
    return $true
  } catch {
    return $false
  }
}

function Get-LocalPackageVersion {
  $PackagePath = Join-Path $ProjectRoot "package.json"
  if (-not (Test-Path $PackagePath)) {
    return ""
  }

  try {
    $Package = Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json
    return [string]$Package.version
  } catch {
    return ""
  }
}

function Get-PortOwnerProcesses($Port) {
  try {
    $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    $processIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ })
    if ($processIds.Count -eq 0) {
      return @()
    }

    return @(Get-CimInstance Win32_Process |
      Where-Object { $processIds -contains $_.ProcessId })
  } catch {
    return @()
  }
}

function Test-ProjectServerProcess($Process) {
  $commandLine = [string]$Process.CommandLine
  if (-not $commandLine) {
    return $false
  }

  $normalizedCommand = $commandLine.ToLowerInvariant().Replace("/", "\")
  $normalizedRoot = $ProjectRoot.ToLowerInvariant().Replace("/", "\")
  return (
    $normalizedCommand.Contains("dist\main.js") -and
    $normalizedCommand.Contains($normalizedRoot)
  )
}

function Get-ProjectServerProcesses {
  try {
    return @(Get-CimInstance Win32_Process |
      Where-Object {
        $_.Name -eq "node.exe" -and
        (Test-ProjectServerProcess $_)
      })
  } catch {
    return @()
  }
}

function Stop-ProjectServerProcesses {
  $processes = @(Get-ProjectServerProcesses)
  foreach ($process in $processes) {
    Write-Host "Stopping MY-PC server process: PID $($process.ProcessId)"
    try {
      Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    } catch {}
  }

  if ($processes.Count -gt 0) {
    Start-Sleep -Seconds 2
  }
}

function Stop-StaleProjectServer($Port) {
  $owners = @(Get-PortOwnerProcesses $Port)
  if ($owners.Count -eq 0) {
    return
  }

  $staleOwners = @($owners | Where-Object { Test-ProjectServerProcess $_ })
  if ($staleOwners.Count -eq 0) {
    $ownerText = ($owners | ForEach-Object { "$($_.Name) PID $($_.ProcessId)" }) -join ", "
    throw "Port $Port is already in use by another process: $ownerText"
  }

  foreach ($owner in $staleOwners) {
    Write-Host "Stopping stale MY-PC server process: PID $($owner.ProcessId)"
    try {
      Stop-Process -Id $owner.ProcessId -Force -ErrorAction SilentlyContinue
    } catch {}
  }

  Start-Sleep -Seconds 2
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

function Initialize-Ghostscript($ProjectRoot) {
  $GhostscriptRoot = Join-Path $ProjectRoot "tools\Ghostscript"
  $Existing = Get-ChildItem -Path (Join-Path $GhostscriptRoot "*\bin\gswin64c.exe") -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $Existing) {
    $Existing = Get-ChildItem -Path (Join-Path $GhostscriptRoot "bin\gswin64c.exe") -ErrorAction SilentlyContinue |
      Select-Object -First 1
  }
  if ($Existing) { return }

  $SystemGhostscript = Get-Command "gswin64c.exe" -ErrorAction SilentlyContinue
  if ($SystemGhostscript) { return }
  $SystemGhostscript = Get-ChildItem -Path @(
    "C:\Program Files\gs\*\bin\gswin64c.exe",
    "C:\Program Files (x86)\gs\*\bin\gswin32c.exe"
  ) -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | Select-Object -First 1
  if ($SystemGhostscript) { return }

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
  } catch {
    Write-Warning "Ghostscript setup failed: $($_.Exception.Message). PDF compatibility mode will fall back to SumatraPDF."
  } finally {
    if ($InstallerTempDir -and (Test-Path -LiteralPath $InstallerTempDir)) {
      Remove-Item -LiteralPath $InstallerTempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}

Initialize-UnicodeConsole

$ConfiguredPort = Get-ConfiguredPort
$RunningStatus = Get-RunningServerStatus $ConfiguredPort
if ($RunningStatus) {
  $LocalVersion = Get-LocalPackageVersion
  $RunningVersion = [string]$RunningStatus.version
  $DiagnosticsAvailable = Test-RunningServerDiagnostics $ConfiguredPort
  if ($LocalVersion -and $RunningVersion -eq $LocalVersion -and $DiagnosticsAvailable) {
    Write-Host "MY-PC WhatsApp Print Server is already running: http://localhost:$ConfiguredPort"
    if ($OpenBrowser) {
      Start-Process "http://localhost:$ConfiguredPort"
    }
    return
  }

  Write-Host "Running server version '$RunningVersion' does not match installed version '$LocalVersion' or diagnostics are missing. Restarting server..."
  Stop-ProjectServerProcesses
}

Stop-StaleProjectServer $ConfiguredPort

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
Initialize-Ghostscript $ProjectRoot

if (-not (Test-Path "config\settings.json") -and (Test-Path "config\settings.example.json")) {
  Copy-Item "config\settings.example.json" "config\settings.json"
}

if ($Hidden) {
  Start-Process -FilePath $NodeExe -ArgumentList @("dist/main.js") -WorkingDirectory $ProjectRoot -WindowStyle Hidden
  if ($OpenBrowser) {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:$ConfiguredPort"
  }
  Write-Host "MY-PC WhatsApp Print Server started in background: http://localhost:$ConfiguredPort"
} else {
  Write-Host "MY-PC WhatsApp Print Server starting: http://localhost:$ConfiguredPort"
  if ($OpenBrowser) {
    Start-Process "http://localhost:$ConfiguredPort"
  }
  & $NodeExe dist/main.js
}
