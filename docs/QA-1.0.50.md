# QA 1.0.50

## Scope

- Lock the customer PDF-password path into the permanent smoke suite.
- Verify the PDF print script accepts a relative SumatraPDF path, a password-protected PDF, and a printer name containing spaces and parentheses.
- Keep the field-failure cases from customer logs visible in the release notes.

## Customer Issue Covered

Customer logs showed PDF print commands with:

- `-SumatraPath tools\SumatraPDF\SumatraPDF.exe`
- `-PrinterName Olivetti d-Copia 400 KX (USB)`
- password-protected PDF requirements
- older failures where Sumatra/Ghostscript errors were hard to diagnose

This release adds a fixed smoke check that runs `print-pdf-profile.ps1` in `-DryRun` mode with those exact command-shape conditions. The check proves the script resolves the relative SumatraPDF path, preserves the full printer name as one argument, and passes the PDF password through to SumatraPDF as `-pwd`.

## Checks

- `npm run qa:smoke`
- `print-pdf-profile.ps1 -DryRun` with encrypted PDF fixture password `312830714`
- Printer name fixture: `Olivetti d-Copia 400 KX (USB)`
