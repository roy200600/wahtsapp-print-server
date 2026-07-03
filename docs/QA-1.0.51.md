# QA 1.0.51

## Scope

- Prevent Ghostscript bootstrap collisions when multiple install/start/update attempts reuse the same temp installer file.
- Use a unique `my-pc-ghostscript-*` temp folder for every Ghostscript download attempt.
- Clean the temp folder after the installer exits or fails.
- Reuse an installed system Ghostscript before attempting any portable download, including installs found under `C:\Program Files\gs\...`.

## Customer Issue Covered

During local validation after `v1.0.50`, startup warned that `gs10071w64.exe` in `%TEMP%` was already being used by another process. A customer machine can hit the same condition after a previous installer, antivirus scan, or parallel update attempt. The app continued with SumatraPDF fallback, but Ghostscript setup did not complete.

This release removes the shared temp filename from Ghostscript bootstrap and isolates each attempt in its own directory.
It also avoids a network download entirely when `gswin64c.exe` is already available on the machine, even when Ghostscript is installed but not added to `PATH`.

## Checks

- `npm run qa:smoke`
- Static QA verifies `install-windows.ps1`, `update-windows.ps1`, and `start-windows.ps1` use `my-pc-ghostscript-*` temp folders.
- Static QA verifies all three scripts check both `Get-Command "gswin64c.exe"` and `C:\Program Files\gs\*\bin\gswin64c.exe` before downloading Ghostscript.
