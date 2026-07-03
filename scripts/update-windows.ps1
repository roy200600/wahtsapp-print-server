param(
  [string]$RepoZipUrl = "https://github.com/roy200600/wahtsapp-print-server/archive/refs/heads/main.zip",
  [switch]$NoStart
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$TempZip = Join-Path $env:TEMP "whatsapp-print-server-update.zip"
$ExtractRoot = Join-Path $env:TEMP "whatsapp-print-server-update-src"

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
  try {
    [Environment]::SetEnvironmentVariable("PATH", $null, "Process")
    [Environment]::SetEnvironmentVariable("Path", $env:Path, "Process")
  } catch {}
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

function Install-PortableNodeRuntime($ProjectRoot) {
  Write-Host "Node.js $MinimumNodeVersion or newer was not found. Downloading portable Node.js runtime..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

  $RuntimeParent = Join-Path $ProjectRoot "runtime"
  $RuntimeRoot = Join-Path $RuntimeParent "node"
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
  return (Join-Path $RuntimeRoot "node.exe")
}

function Get-NodeExe() {
  $RuntimeNode = Join-Path $ProjectRoot "runtime\node\node.exe"
  if ((Test-Path $RuntimeNode) -and (Test-NodeVersion $RuntimeNode)) { return $RuntimeNode }
  $Command = Get-Command "node.exe" -ErrorAction SilentlyContinue
  if ($Command -and (Test-NodeVersion $Command.Source)) { return $Command.Source }
  return Install-PortableNodeRuntime $ProjectRoot
}

function Get-NpmCmd() {
  $RuntimeNode = Join-Path $ProjectRoot "runtime\node\node.exe"
  $RuntimeNpm = Join-Path $ProjectRoot "runtime\node\npm.cmd"
  if ((Test-Path $RuntimeNpm) -and (Test-Path $RuntimeNode) -and (Test-NodeVersion $RuntimeNode)) { return $RuntimeNpm }
  $Command = Get-Command "npm.cmd" -ErrorAction SilentlyContinue
  if ($Command) { return $Command.Source }
  throw "npm was not found. Run scripts\install-windows.ps1 first."
}

function Initialize-SumatraPdf($ProjectRoot) {
  $SumatraDir = Join-Path $ProjectRoot "tools\SumatraPDF"
  $SumatraExe = Join-Path $SumatraDir "SumatraPDF.exe"
  if (Test-Path $SumatraExe) { return }

  Write-Host "SumatraPDF was not found. Downloading portable SumatraPDF..."
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
  New-Item -ItemType Directory -Force -Path $SumatraDir | Out-Null
  $SumatraTempDir = Join-Path $env:TEMP ("my-pc-sumatrapdf-" + [System.Guid]::NewGuid().ToString("N"))
  $SumatraZip = Join-Path $SumatraTempDir "SumatraPDF-3.6.1-64.zip"
  $ExtractRoot = Join-Path $SumatraTempDir "extract"
  New-Item -ItemType Directory -Force -Path $SumatraTempDir | Out-Null
  try {
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

function Get-ConfiguredPort {
  $settingsPath = Join-Path $ProjectRoot "config\settings.json"
  if (Test-Path $settingsPath) {
    try {
      $settings = Get-Content -LiteralPath $settingsPath -Raw | ConvertFrom-Json
      if ($settings.port) {
        return [int]$settings.port
      }
    } catch {}
  }

  return 3010
}

function Stop-PortOwnerProcesses($Port, $Reason) {
  try {
    $processIds = @()
    $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    $processIds += @($connections | Select-Object -ExpandProperty OwningProcess -Unique | Where-Object { $_ })
    if ($processIds.Count -eq 0) {
      $netstatLines = @(& netstat.exe -ano -p tcp | Select-String -Pattern ":$Port\s+.*LISTENING\s+(\d+)")
      foreach ($line in $netstatLines) {
        if ($line.Matches.Count -gt 0) {
          $processIds += [int]$line.Matches[0].Groups[1].Value
        }
      }
    }
    $processIds = @($processIds | Select-Object -Unique)
    foreach ($processId in $processIds) {
      Write-Host "Stopping server process on port ${Port}: PID $processId ($Reason)"
      try {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      } catch {}
    }
    if ($processIds.Count -gt 0) {
      Start-Sleep -Seconds 2
    }
  } catch {}
}

Initialize-UnicodeConsole

Write-Host "Stopping running server..."
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq "node.exe" -and
    ($_.CommandLine -like "*dist/main.js*" -or $_.CommandLine -like "*WhatsAppPrintServer*")
  } |
  ForEach-Object {
    try { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } catch {}
  }
Stop-PortOwnerProcesses (Get-ConfiguredPort) "update"

if (Test-Path $ExtractRoot) {
  Remove-Item -LiteralPath $ExtractRoot -Recurse -Force
}

Write-Host "Downloading latest version..."
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $RepoZipUrl -OutFile $TempZip
Expand-Archive -Path $TempZip -DestinationPath $ExtractRoot -Force

$Source = Get-ChildItem $ExtractRoot -Directory | Select-Object -First 1
if (-not $Source) {
  throw "Could not find extracted project folder."
}

$Preserve = @(
  "auth",
  "config\settings.json",
  "data",
  "downloads",
  "printed",
  "failed",
  "logs",
  "temp",
  "runtime",
  "tools"
)

Write-Host "Copying update files..."
Get-ChildItem $Source.FullName -Force | ForEach-Object {
  $relative = $_.Name
  if ($Preserve -contains $relative) { return }
  Copy-Item -LiteralPath $_.FullName -Destination (Join-Path $ProjectRoot $relative) -Recurse -Force
}

Set-Location -LiteralPath $ProjectRoot
$NodeExe = Get-NodeExe
$NpmCmd = Get-NpmCmd
Enable-PortableNodePath $ProjectRoot $NodeExe
Initialize-SumatraPdf $ProjectRoot
Initialize-Ghostscript $ProjectRoot

Write-Host "Installing dependencies..."
if (Test-Path "package-lock.json") {
  Invoke-Checked $NpmCmd @("ci")
} else {
  Invoke-Checked $NpmCmd @("install")
}

Write-Host "Building project..."
Invoke-Checked $NpmCmd @("run", "build")

if (-not $NoStart) {
  $PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"
  $StartScript = Join-Path $ProjectRoot "scripts\start-windows.ps1"
  $QuotedStartScript = '"' + $StartScript + '"'
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

Write-Host "Update complete."
