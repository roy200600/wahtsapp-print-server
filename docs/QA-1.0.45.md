# QA 1.0.45

## Scope

- Add a regression test for customer printers whose Windows name contains spaces and parentheses.
- Cover startup queue cleanup for names like `Olivetti d-Copia 400 KX (USB)`.
- Keep PDF fallback behavior from Ghostscript to SumatraPDF covered by QA.
- Keep encrypted PDF password handling covered by QA.

## Customer Issues Covered

- Startup queue cleanup previously failed when the printer name was appended to a PowerShell command instead of passed safely.
- Ghostscript missing on customer machines must not be treated as a fatal condition when SumatraPDF fallback is available.
- Password-protected PDFs must wait for the password before printing.

## Checks

- `npm run qa:smoke`
- Dynamic print queue command smoke verifies printer names are base64 encoded and decoded inside PowerShell.
- Dynamic encrypted PDF smoke verifies password `312830714` opens the encrypted fixture and an incorrect password fails.
