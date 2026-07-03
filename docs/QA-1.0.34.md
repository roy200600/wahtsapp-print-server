# QA 1.0.34

## Scope

- Hardened Ghostscript bootstrap during install, update, and startup.
- If the local Ghostscript download or silent install fails, the server continues to install/start and PDF printing falls back to SumatraPDF.
- Kept the encrypted PDF flow intact: password-protected PDFs still ask the customer for a password and pass the verified password into the print profile.

## Verification

- `npm run qa:smoke`
- PowerShell syntax checks for install, update, startup, and print scripts.
- Static QA verifies the installer/update/start scripts contain the non-fatal Ghostscript fallback warning.
- PDF dry-run with Hebrew filename and printer name containing spaces/parentheses.
- Encrypted PDF QA with password `312830714`.

## Notes

- Physical output still needs validation on the customer printer. This version prevents a missing Ghostscript runtime from breaking installation or startup, but a printer driver or spooler issue can still fail at the printer site.
