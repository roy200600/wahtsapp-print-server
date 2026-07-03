# QA 1.0.33

## Scope

- Added local Ghostscript bootstrap to Windows install, update, and start scripts.
- Updated the PDF print profile to prefer `tools\Ghostscript` before system-wide Ghostscript paths.
- Kept SumatraPDF as a fallback path when Ghostscript is unavailable or fails.
- Kept the existing customer, WhatsApp, print queue, and database flows unchanged.

## Verification

- `npm run qa:smoke`
- PowerShell syntax QA covers the updated install, update, start, and PDF profile scripts.
- Static QA verifies:
  - `Initialize-Ghostscript` exists in Windows install/update/start scripts.
  - The official Ghostscript Windows asset `gs10071w64.exe` is referenced.
  - The PDF profile searches `tools\Ghostscript`.
- Existing encrypted PDF order flow QA remains covered with password `312830714`.
- Existing SumatraPDF fallback, UI, alert, printer queue, Office dry-run, and file-validation checks remain active.

## Notes

- Ghostscript is installed locally under the app `tools` folder so PDF compatibility mode has a stronger engine on customer machines.
- Physical printer validation is still required on the customer printer.
