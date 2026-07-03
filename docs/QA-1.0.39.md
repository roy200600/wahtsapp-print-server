# QA 1.0.39

## Scope

- Hardened Windows startup when port `3010` is occupied by a stale MY-PC server process.
- Prevented repeated `EADDRINUSE` startup loops after reboot or manual double-start.
- Preserved existing PDF, WhatsApp, licensing, and print flow behavior.

## Changes

- `scripts/start-windows.ps1` now checks which process owns the configured port when `/api/status` does not respond.
- If the port owner is a stale Node process running this project's `dist/main.js`, the script stops it and starts a fresh server.
- If the port belongs to another application, startup fails with a clear message instead of silently opening a broken dashboard.

## Verification

- Added static QA coverage for the stale-server recovery path:
  - `Stop-StaleProjectServer`
  - `Get-NetTCPConnection`
  - explicit non-MY-PC port-owner error message
- Existing QA still covers:
  - Ghostscript and SumatraPDF bootstrap
  - password-protected PDF handling
  - owner and manager alert recipients
  - Rubik, RTL, Lucide, responsive UI, and service worker cache versioning

## Remaining Field Validation

- Physical print output still needs validation on each customer printer/driver.
- Customer machines with files already moved to `failed` must resend those files or retry them manually after updating.
