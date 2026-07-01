param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$PrinterName,

  [int]$Copies = 1
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "Excel file not found: $FilePath"
}

$printer = Get-Printer -Name $PrinterName -ErrorAction SilentlyContinue
if (-not $printer) {
  throw "Printer not found: $PrinterName"
}

function Get-DefaultPrinterName {
  $defaultPrinter = Get-CimInstance Win32_Printer | Where-Object { $_.Default } | Select-Object -First 1
  if ($defaultPrinter) {
    return $defaultPrinter.Name
  }
  return $null
}

function Set-DefaultPrinter {
  param([string]$Name)

  if (-not $Name) {
    return
  }

  $targetPrinter = Get-CimInstance Win32_Printer | Where-Object { $_.Name -eq $Name } | Select-Object -First 1
  if (-not $targetPrinter) {
    throw "Printer not found: $Name"
  }

  $result = Invoke-CimMethod -InputObject $targetPrinter -MethodName SetDefaultPrinter
  if ($result.ReturnValue -ne 0) {
    throw "Failed to set default printer: $Name"
  }
}

function Test-WorksheetHasData {
  param($Excel, $Sheet)

  try {
    $used = $Sheet.UsedRange
    if (-not $used) {
      return $false
    }
    return ($Excel.WorksheetFunction.CountA($used) -gt 0)
  } catch {
    return $true
  }
}

function Invoke-WorksheetPrint {
  param($Sheet, [int]$CopyCount)

  $safeCopies = [Math]::Max(1, $CopyCount)
  for ($copy = 1; $copy -le $safeCopies; $copy++) {
    $Sheet.Activate()
    $Sheet.PrintOut()
  }
}

$excel = $null
$workbook = $null
$previousDefaultPrinter = Get-DefaultPrinterName

try {
  Set-DefaultPrinter -Name $PrinterName

  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $workbook = $excel.Workbooks.Open($FilePath, $null, $true)

  $printedSheets = 0
  foreach ($sheet in $workbook.Worksheets) {
    if (-not (Test-WorksheetHasData -Excel $excel -Sheet $sheet)) {
      continue
    }

    $used = $sheet.UsedRange
    if (-not $sheet.PageSetup.PrintArea -and $used) {
      $sheet.PageSetup.PrintArea = $used.Address($false, $false)
    }
    $sheet.PageSetup.Orientation = 2
    $sheet.PageSetup.PaperSize = 9
    $sheet.PageSetup.Zoom = $false
    $sheet.PageSetup.FitToPagesWide = 1
    $sheet.PageSetup.FitToPagesTall = $false
    Invoke-WorksheetPrint -Sheet $sheet -CopyCount ([Math]::Max(1, $Copies))
    $printedSheets += 1
  }

  if ($printedSheets -lt 1) {
    throw "Excel file has no printable worksheets"
  }
} finally {
  if ($workbook) {
    $workbook.Close($false)
  }
  if ($excel) {
    $excel.Quit()
  }
  if ($previousDefaultPrinter -and $previousDefaultPrinter -ne $PrinterName) {
    Set-DefaultPrinter -Name $previousDefaultPrinter
  }
}
