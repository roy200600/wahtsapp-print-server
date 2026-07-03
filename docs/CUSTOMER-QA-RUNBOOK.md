# Customer QA Runbook

Use this runbook after installing or updating a customer machine to `v1.0.42` or newer.

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
- Application version.
- Whether the running server is new enough for print-engine diagnostics.
- WhatsApp connection state.
- Selected printer name.
- License mode.
- SumatraPDF availability.
- Ghostscript availability.
- Windows printer list availability.
- Required project folders.
- Node.js or bundled Node.js availability.

## What It Does Not Do

- It does not print a test page.
- It does not clear the Windows print queue.
- It does not send data to MY-PC automatically.
- It does not change settings.

## Manual Field Test After The Report

After the report is created:

1. Open the app dashboard.
2. Confirm the report does not show `serverVersion` as failed.
3. Confirm diagnostics show SumatraPDF available.
4. Confirm Ghostscript is available or clearly shown as a warning.
5. Send a normal PDF and confirm paper output.
6. Send a password-protected PDF and reply with the password.
7. Send JPG/JPEG/PNG and confirm paper output.
8. Send DOC/DOCX only if Microsoft Word or a compatible Office app is installed.
9. Send XLS/XLSX and PPT/PPTX only if Office is installed.
10. Restart the PC after a queued job and confirm later jobs are not blocked.

## Version Meaning

- `serverVersion` failed: the running server is too old. Restart the app after updating, or run the cloud update again.
- `serverVersion` warning: the server can run diagnostics but is not on the latest recommended version.
- `serverVersion` passed: the server is on the recommended version for this QA script.

## When To Send The Report To MY-PC

Send the generated `customer-qa-*.json` report when:

- The dashboard opens but printing fails.
- PDF fails with Ghostscript or SumatraPDF errors.
- The selected printer is missing or renamed.
- WhatsApp is connected but jobs do not progress.
- Jobs remain stuck after restart.
