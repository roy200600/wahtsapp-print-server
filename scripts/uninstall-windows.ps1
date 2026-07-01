$ErrorActionPreference = "Stop"

$ShortcutPath = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup\MY-PC WhatsApp Print Server.lnk"
if (Test-Path $ShortcutPath) {
  Remove-Item -LiteralPath $ShortcutPath -Force
  Write-Host "Removed startup shortcut."
}

Write-Host "Uninstall complete. Project files were not deleted."
