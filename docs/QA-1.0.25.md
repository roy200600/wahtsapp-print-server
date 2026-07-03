# QA Report - MY-PC WhatsApp Print Server 1.0.25

## Scope

- Customer issue logs from Olivetti and SEC/Samsung printer installs.
- PDF fallback path when Ghostscript is missing.
- Startup recovery when the server is launched more than once.
- Owner system alerts for production failures.
- Password-protected PDF order cleanup after an invalid password.

## Checks

- `npm run qa:smoke`
  - Confirms PDF print profile still falls back from Ghostscript to SumatraPDF.
  - Confirms SumatraPDF native process execution uses `ProcessStartInfo` for stable exit codes.
  - Confirms Windows print queue cleanup passes printer names through Base64 so names with spaces and parentheses are safe.
  - Confirms duplicate server startup handles `EADDRINUSE` without crashing the customer machine.
  - Confirms owner alert routing includes `972522250223`.
  - Confirms invalid password PDF cleanup removes empty pending orders.

## Notes

- Customer PDF files that already failed in older versions must be resent or retried manually after the update.
- Trial installs still allow only PDF/JPG/JPEG/PNG by design.
