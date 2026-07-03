# QA Report - MY-PC WhatsApp Print Server 1.0.19

## Scope

This QA pass focuses on customer-reported failures from production logs:

- Password-protected PDF files.
- PDF failures when Ghostscript is not installed.
- SumatraPDF failures with Hebrew file names and printer names containing spaces/parentheses.
- Startup recovery and Windows spooler cleanup.
- Empty error objects in logs.
- Word files rejected under Trial mode.
- Basic UI/UX sanity after the Rubik/dashboard update.

## Automated Checks Completed

- TypeScript build: passed with `npm run build`.
- PowerShell syntax check: passed for `scripts/print-pdf-profile.ps1` and `scripts/start-windows.ps1`.
- PDF security smoke test:
  - Regular PDF is not marked as password-protected.
  - PDF containing `/Encrypt` is marked as password-protected.
  - Password text is parsed from Hebrew and English messages.

## Fixes Included

- Added password-protected PDF flow:
  - Detect encrypted PDFs before printing.
  - Ask the customer for the PDF password.
  - Validate the password with SumatraPDF before printing.
  - Print only after the password is verified.
  - Mark invalid password cases as failed and alert the admin.
- Added `-pwd` support to the PDF print profile script.
- Added Ghostscript PDF password forwarding with `-sPDFPassword`.
- Improved system alerts:
  - The configured alert phone receives alerts when enabled.
  - MY-PC owner phone `972522250223` receives system alerts automatically.
  - Alerts include customer, file, printer, job, size and computer details.
- Improved print failure logs:
  - Uses structured `err` fields so stack/message are not logged as `{}`.
- Startup script now opens and reports the configured port instead of always `3010`.

## UI/UX Checklist

- Rubik font is bundled locally and used by the app shell.
- Dark dashboard layout remains the active visual direction.
- No new UI API/event names were added for this QA pass.
- No database schema change was added.

## Physical QA Still Required

These checks require a real printer/customer machine:

- Print a normal PDF on Xerox/HP/Samsung/Olivetti.
- Print a PDF with Hebrew filename.
- Print a password-protected PDF with correct password.
- Print a password-protected PDF with wrong password and verify alert delivery.
- Print JPG/JPEG/PNG.
- Print DOC/DOCX in licensed mode.
- Verify Trial mode still blocks DOC/DOCX by design.
- Verify stop-print button on a long real print job.

## Notes

- DOC rejection in Trial mode is expected: Trial allows only PDF/JPG/JPEG/PNG.
- SumatraPDF is still used as the main PDF CLI engine because it supports `-pwd`, silent printing and command-line exit codes.
