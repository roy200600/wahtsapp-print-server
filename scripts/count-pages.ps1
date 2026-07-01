param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$Extension
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $FilePath)) {
  throw "File not found: $FilePath"
}

function Get-TextPageCount {
  param([string]$Path)

  $lineCount = (Get-Content -LiteralPath $Path -ErrorAction Stop | Measure-Object -Line).Lines
  return [Math]::Max(1, [Math]::Ceiling($lineCount / 60))
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

function Get-ExcelPageCount {
  param([string]$Path)

  $excel = $null
  $workbook = $null

  try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    $workbook = $excel.Workbooks.Open($Path, $null, $true)

    $total = 0
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
      $sheet.Activate()

      $pages = 1
      try {
        $sheet.DisplayPageBreaks = $true
        $pages = [int]$excel.ExecuteExcel4Macro("GET.DOCUMENT(50)")
        if ($pages -lt 1) {
          $pages = [Math]::Max(1, ($sheet.HPageBreaks.Count + 1) * ($sheet.VPageBreaks.Count + 1))
        }
      } catch {
        $pages = 1
      }

      $total += [Math]::Max(1, $pages)
    }

    return [Math]::Max(1, $total)
  } finally {
    if ($workbook) {
      $workbook.Close($false)
    }
    if ($excel) {
      $excel.Quit()
    }
  }
}

function Get-WordPageCount {
  param([string]$Path)

  $word = $null
  $document = $null

  try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $document = $word.Documents.Open($Path, $false, $true)
    $document.Repaginate()
    return [Math]::Max(1, [int]$document.ComputeStatistics(2))
  } finally {
    if ($document) {
      $document.Close($false)
    }
    if ($word) {
      $word.Quit()
    }
  }
}

function Get-PowerPointPageCount {
  param([string]$Path)

  $powerPoint = $null
  $presentation = $null

  try {
    $powerPoint = New-Object -ComObject PowerPoint.Application
    $presentation = $powerPoint.Presentations.Open($Path, $true, $true, $false)
    return [Math]::Max(1, [int]$presentation.Slides.Count)
  } finally {
    if ($presentation) {
      $presentation.Close()
    }
    if ($powerPoint) {
      $powerPoint.Quit()
    }
  }
}

$normalizedExtension = $Extension.TrimStart(".").ToLowerInvariant()

try {
  switch ($normalizedExtension) {
    { $_ -in @("xls", "xlsx") } {
      Write-Output (Get-ExcelPageCount -Path $FilePath)
      break
    }
    "csv" {
      try {
        Write-Output (Get-ExcelPageCount -Path $FilePath)
      } catch {
        Write-Output (Get-TextPageCount -Path $FilePath)
      }
      break
    }
    { $_ -in @("doc", "docx", "rtf") } {
      Write-Output (Get-WordPageCount -Path $FilePath)
      break
    }
    { $_ -in @("ppt", "pptx") } {
      Write-Output (Get-PowerPointPageCount -Path $FilePath)
      break
    }
    "txt" {
      Write-Output (Get-TextPageCount -Path $FilePath)
      break
    }
    default {
      Write-Output 1
      break
    }
  }
} catch {
  Write-Output 1
}
