# QA 1.0.43

## Scope

Version 1.0.43 adds an in-app customer QA report export from the diagnostics screen.

This complements `scripts/customer-qa.ps1` for cases where a technician can open the dashboard but does not want to use PowerShell.

## Changes Verified

- Diagnostics page includes a "הפק דוח QA לקוח" button.
- The button gathers:
  - `/api/status`
  - `/api/diagnostics/print-engines`
  - `/api/printers/details`
  - `/api/log-files`
- The report is downloaded as JSON.
- The report includes app version, WhatsApp state, selected printer, license mode, print-engine status, printer status summaries, and log file metadata.
- The action does not print, clear queues, or change settings.

## Expected Result

When a customer machine has printer/PDF failures, a technician can open Diagnostics, click the QA report button, and send the generated JSON report to MY-PC for review.

Physical print output still requires manual field validation on the customer printer.

