# QA 1.0.56

## Scope

This is a consolidated customer-stability release. It groups the fixes from the parallel review into one update instead of shipping separate small patches.

## Changes Covered

- Password-protected PDF customer QA now runs a safe dry-run with password `312830714`, verifies SumatraPDF receives `-pwd 312830714`, and uses a unique fake printer name so no physical job is sent.
- Word and Excel print scripts open a temporary copy of the source file to reduce locked-file and `EBUSY` failures when the app later moves files to `printed` or `failed`.
- Startup queue cleanup now recognizes MY-PC PowerPoint temp jobs while staying scoped to MY-PC jobs only.
- Install/update/start scripts extract SumatraPDF into a unique temporary folder and clean it afterward, reducing collisions and failed reinstall attempts.
- Install/update/startup launch commands quote `start-windows.ps1`, so project paths with spaces keep working.
- The dashboard shell is shown only after the first data load succeeds, and long UI text gets wrapping guards to reduce blank or broken screens.

## Checks

- TypeScript build.
- Full `scripts/qa-smoke.ps1` coverage.
- Customer QA report including frontend, selected printer, print-engine diagnostics, and encrypted PDF dry-run.
- Local startup/status verification against `/api/status`.

## Still Requires Field Validation

- Correct-password encrypted PDF physical output on a real customer printer.
- Wrong-password customer flow: no physical print and system alerts to the configured manager plus MY-PC owner.
- Real paper output for PDF, JPG/JPEG/PNG, DOC/DOCX, XLS/XLSX, and PPT/PPTX on at least one customer machine.
- Restart or power loss during an active print job on a customer machine, then confirming later jobs are not blocked.
