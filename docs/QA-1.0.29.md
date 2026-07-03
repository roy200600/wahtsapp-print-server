# QA Report - MY-PC WhatsApp Print Server 1.0.29

Date: 2026-07-03

## Focus

- Strengthened print-failure diagnostics for customer environments where a physical printer or PDF engine fails.
- Added QA coverage to ensure alerts keep technical details such as command, exit code, stdout, and stderr.

## What Changed

- Added `src/errorDetails.ts` to normalize unknown error objects, Node `execFile` errors, and plain strings.
- Print failure reasons now include a `Technical details` section when the error contains useful fields.
- The logger also records structured `errorDetails` for easier diagnosis from the in-app log viewer.

## Customer Issue Coverage

- Helps diagnose PDF failures like:
  - Ghostscript missing,
  - SumatraPDF exit code,
  - PowerShell command failure,
  - printer names with spaces or parentheses,
  - empty or object-shaped errors.

## QA Evidence

- `npm run qa:smoke` verifies:
  - TypeScript build,
  - PowerShell syntax,
  - UI/UX regression checks,
  - PDF password flow,
  - PDF dry-run quoting,
  - Word/JPEG validation,
  - owner alert phone,
  - detailed error formatting.

## Notes

This version improves the information we receive when a customer printer fails. Physical print output still needs live verification per printer model/site.
