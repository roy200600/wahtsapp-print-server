param(
  [string]$BaseUrl = "http://localhost:3010",
  [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [switch]$OpenReport
)

$ErrorActionPreference = "Stop"
$MinimumDiagnosticsVersion = "1.0.42"
$RecommendedVersion = "1.0.54"

function Add-Check {
  param(
    [string]$Name,
    [string]$Status,
    [string]$Message = "",
    [object]$Details = $null
  )

  $script:Checks += [pscustomobject]@{
    name = $Name
    status = $Status
    message = $Message
    details = $Details
  }
}

function Invoke-Json {
  param([string]$Url)

  try {
    $value = Invoke-RestMethod -Uri $Url -TimeoutSec 10
    return [pscustomobject]@{
      ok = $true
      value = $value
      error = ""
      url = $Url
    }
  } catch {
    return [pscustomobject]@{
      ok = $false
      value = $null
      error = $_.Exception.Message
      url = $Url
    }
  }
}

function Test-PathStatus {
  param([string]$Path)

  [pscustomobject]@{
    path = $Path
    exists = Test-Path -LiteralPath $Path
  }
}

function Test-VersionAtLeast {
  param(
    [string]$Current,
    [string]$Minimum
  )

  try {
    return ([version]$Current) -ge ([version]$Minimum)
  } catch {
    return $false
  }
}

$Checks = @()
$timestamp = Get-Date
$logsDir = Join-Path $ProjectRoot "logs"
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$status = Invoke-Json "$BaseUrl/api/status"
if (-not $status.ok) {
  Add-Check "server" "failed" "Cannot reach local server." $status
} else {
  Add-Check "server" "passed" "Local server is responding." @{
    version = $status.value.version
    whatsappConnected = $status.value.whatsapp.connected
    printerName = $status.value.config.printerName
    licenseMode = $status.value.license.mode
  }

  if (-not (Test-VersionAtLeast $status.value.version $MinimumDiagnosticsVersion)) {
    Add-Check "serverVersion" "failed" "Server version is too old for print-engine diagnostics. Update or restart the customer installation." @{
      currentVersion = $status.value.version
      minimumDiagnosticsVersion = $MinimumDiagnosticsVersion
      recommendedVersion = $RecommendedVersion
    }
  } elseif (-not (Test-VersionAtLeast $status.value.version $RecommendedVersion)) {
    Add-Check "serverVersion" "warning" "Server is compatible, but not on the latest recommended version." @{
      currentVersion = $status.value.version
      minimumDiagnosticsVersion = $MinimumDiagnosticsVersion
      recommendedVersion = $RecommendedVersion
    }
  } else {
    Add-Check "serverVersion" "passed" "Server version is current for this QA report." @{
      currentVersion = $status.value.version
      minimumDiagnosticsVersion = $MinimumDiagnosticsVersion
      recommendedVersion = $RecommendedVersion
    }
  }
}

$engines = Invoke-Json "$BaseUrl/api/diagnostics/print-engines"
if (-not $engines.ok) {
  $message = "Cannot read print-engine diagnostics."
  if ($engines.error -match "404") {
    $message = "Print-engine diagnostics endpoint is missing. Restart the server or update the customer installation to v$MinimumDiagnosticsVersion or newer."
  }
  Add-Check "printEngines" "failed" $message $engines
} else {
  $engineStatus = if ($engines.value.ok) { "passed" } else { "warning" }
  Add-Check "printEngines" $engineStatus "PDF print engine diagnostics completed." $engines.value
}

$printers = Invoke-Json "$BaseUrl/api/printers/details"
$selectedPrinterName = ""
if ($status.ok -and $status.value.config.printerName) {
  $selectedPrinterName = [string]$status.value.config.printerName
}
if (-not $printers.ok) {
  Add-Check "printers" "failed" "Cannot read Windows printer list." $printers
} else {
  $printerRows = @($printers.value)
  Add-Check "printers" "passed" "Windows printer list was read." @{
    count = $printerRows.Count
    names = @($printerRows | ForEach-Object { $_.name })
  }

  if ([string]::IsNullOrWhiteSpace($selectedPrinterName)) {
    Add-Check "selectedPrinter" "warning" "No printer is selected in the application settings." @{
      selectedPrinter = $selectedPrinterName
    }
  } else {
    $selectedPrinter = $printerRows | Where-Object { $_.name -eq $selectedPrinterName } | Select-Object -First 1
    if ($selectedPrinter) {
      Add-Check "selectedPrinter" "passed" "Selected printer exists in Windows printer list." @{
        selectedPrinter = $selectedPrinterName
        details = $selectedPrinter
      }
    } else {
      Add-Check "selectedPrinter" "failed" "Selected printer was not found in Windows printer list. Choose the printer again in settings." @{
        selectedPrinter = $selectedPrinterName
        availablePrinters = @($printerRows | ForEach-Object { $_.name })
      }
    }
  }
}

$paths = @(
  "config",
  "downloads",
  "printed",
  "failed",
  "logs",
  "temp",
  "tools",
  "tools\SumatraPDF\SumatraPDF.exe"
) | ForEach-Object { Test-PathStatus (Join-Path $ProjectRoot $_) }

$missingPaths = @($paths | Where-Object { -not $_.exists })
Add-Check "paths" ($(if ($missingPaths.Count -eq 0) { "passed" } else { "warning" })) "Project folder path check completed." @{
  paths = $paths
  missing = $missingPaths
}

$nodeVersion = $null
try {
  $nodeVersion = (& node --version)
  Add-Check "node" "passed" "Node.js is available." @{ version = $nodeVersion }
} catch {
  $bundledNode = Join-Path $ProjectRoot "runtime\node\node.exe"
  if (Test-Path -LiteralPath $bundledNode) {
    $nodeVersion = (& $bundledNode --version)
    Add-Check "node" "passed" "Bundled Node.js is available." @{ version = $nodeVersion; path = $bundledNode }
  } else {
    Add-Check "node" "failed" "Node.js was not found." @{ error = $_.Exception.Message }
  }
}

$report = [pscustomobject]@{
  generatedAt = $timestamp.ToString("o")
  computerName = $env:COMPUTERNAME
  userName = $env:USERNAME
  baseUrl = $BaseUrl
  projectRoot = $ProjectRoot
  minimumDiagnosticsVersion = $MinimumDiagnosticsVersion
  recommendedVersion = $RecommendedVersion
  fieldValidationChecklist = @(
    "Send a normal PDF and confirm physical paper output.",
    "Send a password-protected PDF and reply with the password. Confirm physical paper output.",
    "Send the wrong PDF password. Confirm no print and a system alert to manager plus MY-PC owner.",
    "Send JPG, JPEG, and PNG. Confirm physical paper output.",
    "Send DOC/DOCX only when Word or compatible Office is installed. Confirm physical paper output.",
    "Send XLS/XLSX and PPT/PPTX only when Office is installed. Confirm physical paper output.",
    "Restart the PC during or after a queued job. Confirm later jobs are not blocked.",
    "Use the selected printer name exactly as shown in Windows, including spaces and parentheses."
  )
  checks = $Checks
}

$reportPath = Join-Path $logsDir ("customer-qa-{0}.json" -f $timestamp.ToString("yyyyMMdd-HHmmss"))
$report | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $reportPath -Encoding UTF8

Write-Host ""
Write-Host "Customer QA report created:"
Write-Host $reportPath
Write-Host ""

$failed = @($Checks | Where-Object { $_.status -eq "failed" })
$warnings = @($Checks | Where-Object { $_.status -eq "warning" })
Write-Host ("Passed: {0} | Warnings: {1} | Failed: {2}" -f @($Checks | Where-Object { $_.status -eq "passed" }).Count, $warnings.Count, $failed.Count)

if ($failed.Count -gt 0) {
  Write-Host "Failed checks:"
  $failed | ForEach-Object { Write-Host ("- {0}: {1}" -f $_.name, $_.message) }
}

if ($warnings.Count -gt 0) {
  Write-Host "Warnings:"
  $warnings | ForEach-Object { Write-Host ("- {0}: {1}" -f $_.name, $_.message) }
}

if ($OpenReport) {
  Start-Process -FilePath $reportPath
}
