# Customer QA Runbook

Use this runbook after installing or updating a customer machine to `v1.0.58` or newer.

## Quick Command

Run from the installed project folder:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\customer-qa.ps1
```

The script creates a local JSON report under:

```text
logs\customer-qa-YYYYMMDD-HHMMSS.json
```

## What It Checks

- Local server availability at `http://localhost:3010`.
- Dashboard HTML and core UI asset references.
- Application version.
- Whether the running server is new enough for print-engine diagnostics.
- WhatsApp connection state.
- Selected printer name.
- License mode.
- SumatraPDF availability.
- Ghostscript availability.
- Windows printer list availability.
- Whether the selected printer exists in the Windows printer list.
- Required project folders.
- Password-protected PDF dry-run with password `312830714`, using a unique fake dry-run printer name so no physical print job is sent.
- Node.js or bundled Node.js availability.
- A manual field-validation checklist for the physical print tests.

## What It Does Not Do

- It does not print a test page.
- It does not send the encrypted PDF dry-run to the selected customer printer.
- It does not clear the Windows print queue.
- It does not send data to MY-PC automatically.
- It does not change settings.

## Manual Field Test After The Report

After the report is created:

1. Open the app dashboard.
2. Confirm the report does not show `serverVersion` as failed.
3. Confirm diagnostics show SumatraPDF available.
4. Confirm Ghostscript is available or clearly shown as a warning.
5. Confirm `encryptedPdfDryRun` passed. This proves the password-protected PDF command is built in dry-run mode only.
6. Send a normal PDF and confirm paper output.
7. Send a password-protected PDF and reply with the password.
8. Send the wrong PDF password and confirm no paper output plus system alerts.
9. Send JPG/JPEG/PNG and confirm paper output.
10. Send DOC/DOCX only if Microsoft Word or a compatible Office app is installed.
11. Send XLS/XLSX and PPT/PPTX only if Office is installed.
12. Restart the PC after a queued job and confirm later jobs are not blocked.

## Version Meaning

- `serverVersion` failed: the running server is too old. Restart the app after updating, or run the cloud update again.
- `serverVersion` warning: the server can run diagnostics but is not on the latest recommended version.
- `serverVersion` passed: the server is on the recommended version for this QA script.

## When To Send The Report To MY-PC

Send the generated `customer-qa-*.json` report when:

- The dashboard opens but printing fails.
- The dashboard is blank, partially loaded, or visually broken.
- PDF fails with Ghostscript or SumatraPDF errors.
- The selected printer is missing or renamed.
- WhatsApp is connected but jobs do not progress.
- Jobs remain stuck after restart.

## Required Physical Confirmation

The JSON report proves software readiness only. It does not prove that paper came out of the printer.

Before marking a customer installation as fully verified, confirm:

1. PDF printed physically.
2. Password-protected PDF printed physically after the correct password.
3. Wrong PDF password did not print and generated alerts.
4. JPG/JPEG/PNG printed physically.
5. DOC/DOCX printed physically when Office is installed.
6. Restart during an active or queued job does not block later jobs.
