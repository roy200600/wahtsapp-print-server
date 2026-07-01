param(
  [ValidateSet("excel", "powerpoint")]
  [string]$Type,
  [Parameter(Mandatory = $true)]
  [string]$PrinterName,
  [int]$Copies = 1,
  [string]$PaperSize = "A4",
  [ValidateSet("auto", "portrait", "landscape")]
  [string]$ExcelOrientation = "landscape",
  [ValidateSet("auto", "portrait", "landscape")]
  [string]$PowerPointOrientation = "landscape",
  [string]$FitToWidth = "true"
)

$ErrorActionPreference = "Stop"
$TempRoot = Join-Path $env:TEMP "my-pc-office-tests"
New-Item -ItemType Directory -Force -Path $TempRoot | Out-Null
$ShouldFitToWidth = $FitToWidth -eq "true"

function Release-Com($Object) {
  if ($null -ne $Object) {
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($Object) | Out-Null
  }
}

function Set-ActivePrinter($Application, [string]$PrinterName) {
  try {
    $Application.ActivePrinter = $PrinterName
  } catch {
    # Some Office versions require the full port name. PrintOut with ActivePrinter
    # still works on many drivers, so keep going and let the driver report failure.
  }
}

if ($Type -eq "excel") {
  $excel = $null
  $workbook = $null
  $sheet = $null
  try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $false
    $excel.DisplayAlerts = $false
    Set-ActivePrinter $excel $PrinterName

    $workbook = $excel.Workbooks.Add()
    $sheet = $workbook.Worksheets.Item(1)
    $sheet.Name = "MY-PC Test"
    $sheet.Range("A1").Value2 = "MY-PC WhatsApp Print Server"
    $sheet.Range("A2").Value2 = "Excel print test"
    $sheet.Range("A4").Value2 = "Customer"
    $sheet.Range("B4").Value2 = "Pages"
    $sheet.Range("C4").Value2 = "Status"
    for ($i = 1; $i -le 8; $i++) {
      $row = 4 + $i
      $sheet.Range("A$row").Value2 = "Test customer $i"
      $sheet.Range("B$row").Value2 = $i
      $sheet.Range("C$row").Value2 = "Ready"
    }
    $sheet.UsedRange.Columns.AutoFit() | Out-Null
    $sheet.PageSetup.PrintArea = $sheet.UsedRange.Address()
    if ($ExcelOrientation -eq "portrait") { $sheet.PageSetup.Orientation = 1 }
    if ($ExcelOrientation -eq "landscape") { $sheet.PageSetup.Orientation = 2 }
    if ($ShouldFitToWidth) {
      $sheet.PageSetup.Zoom = $false
      $sheet.PageSetup.FitToPagesWide = 1
      $sheet.PageSetup.FitToPagesTall = $false
    }

    $filePath = Join-Path $TempRoot "my-pc-excel-test.xlsx"
    $workbook.SaveAs($filePath)
    $sheet.PrintOut($null, $null, [Math]::Max(1, $Copies), $false, $PrinterName)
  } finally {
    if ($workbook) { $workbook.Close($false) | Out-Null }
    if ($excel) { $excel.Quit() | Out-Null }
    Release-Com $sheet
    Release-Com $workbook
    Release-Com $excel
  }
  exit 0
}

$powerPoint = $null
$presentation = $null
try {
  $powerPoint = New-Object -ComObject PowerPoint.Application
  $presentation = $powerPoint.Presentations.Add()
  $slide = $presentation.Slides.Add(1, 12)
  $slide.Shapes.AddTextbox(1, 60, 50, 600, 60).TextFrame.TextRange.Text = "MY-PC WhatsApp Print Server"
  $slide.Shapes.AddTextbox(1, 60, 120, 600, 60).TextFrame.TextRange.Text = "PowerPoint print test"
  $slide.Shapes.AddTextbox(1, 60, 190, 600, 120).TextFrame.TextRange.Text = "If this page printed, PowerPoint automation is available on this computer."

  if ($PowerPointOrientation -eq "portrait") { $presentation.PageSetup.SlideOrientation = 1 }
  if ($PowerPointOrientation -eq "landscape") { $presentation.PageSetup.SlideOrientation = 2 }

  $filePath = Join-Path $TempRoot "my-pc-powerpoint-test.pptx"
  $presentation.SaveAs($filePath)
  $presentation.PrintOptions.ActivePrinter = $PrinterName
  $presentation.PrintOut(1, $presentation.Slides.Count, "", [Math]::Max(1, $Copies), $false)
} finally {
  if ($presentation) { $presentation.Close() | Out-Null }
  if ($powerPoint) { $powerPoint.Quit() | Out-Null }
  Release-Com $presentation
  Release-Com $powerPoint
}
