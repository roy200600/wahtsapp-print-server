# Customer Issues QA Matrix

This matrix tracks the active customer QA goal and separates proven code coverage from items that still require field validation.

## Current Release

- Customer release tag: `v1.0.42`
- Latest repository commit: `08d116d Add print engine diagnostics smoke test`
- Latest full QA command: `npm run qa:smoke`

## Requirement Status

| Requirement | Status | Evidence |
| --- | --- | --- |
| Full QA smoke coverage | Covered | `scripts/qa-smoke.ps1` builds TypeScript, checks PowerShell scripts, validates UI/static requirements, encrypted PDF handling, alerts, file validation, PDF dry-run, Office/image/text dry-runs, and print-engine diagnostics. |
| UI/UX baseline | Covered by static QA | Rubik font, RTL, responsive breakpoints, reduced motion, stable table layout, Lucide initialization, service-worker cache versioning, and diagnostics UI are checked in `scripts/qa-smoke.ps1`. |
| PDF password detection | Covered | `src/pdfSecurity.ts` detects `/Encrypt`; `scripts/qa-smoke.ps1` uses `tests/fixtures/encrypted-password-312830714.pdf`. |
| PDF password prompt flow | Covered | `src/printOrders.ts` holds encrypted PDF jobs, prompts the customer for a password, verifies the password, and only then proceeds. |
| Wrong PDF password does not print | Covered | Encrypted PDF order-flow QA verifies wrong-password handling and alert routing. |
| Correct PDF password allows printing flow | Covered to application boundary | QA verifies password `312830714` opens the fixture and page count is resolved. Physical printer output still requires field validation. |
| System alert to configured manager | Covered | `src/alerts.ts` and QA verify configured alert recipients. |
| Owner alert to `0522250223` | Covered | `src/alerts.ts` normalizes owner routing through `972522250223`; QA checks recipient inclusion. |
| Alerts include server/customer/file/printer context | Covered | `formatSystemAlert` QA checks app version, computer, job, customer, file, size, printer, and extra details. |
| Ghostscript missing customer failure | Mitigated | Install/update/start scripts bootstrap local Ghostscript; `v1.0.42` adds `/api/diagnostics/print-engines` and a diagnostics UI card. |
| SumatraPDF missing customer failure | Mitigated | Install/update/start scripts bootstrap SumatraPDF; diagnostics reports missing SumatraPDF as a blocking PDF issue. |
| Printer names with spaces/parentheses such as `Olivetti d-Copia 400 KX (USB)` | Covered | `src/printQueue.ts` passes printer names to PowerShell via Base64; QA checks this path. |
| Empty `{}` print failure logs | Covered | `src/errorDetails.ts` expands non-Error objects with constructor/type/technical details; QA covers empty object errors. |
| Legacy `.doc` support | Covered by configuration/security | `src/config.ts` defaults include `doc`; `src/security.ts` accepts CFB containers for legacy Office files. |
| Images/JPG/JPEG/PNG | Covered to dry-run boundary | `scripts/qa-smoke.ps1` validates image dry-run script coverage. Physical printer output still requires field validation. |
| Office files Word/Excel/PowerPoint | Covered to dry-run boundary | Default allowed types include Office formats and QA exercises Office print scripts in dry-run mode. Physical output still requires field validation. |
| Service-worker stale UI after update | Covered | `v1.0.41` stopped caching the HTML shell and added UI/server version mismatch recovery. |
| Customer physical print output | Not fully proven | Requires real customer machine + real printer validation. Code QA cannot prove paper output, spooler behavior, driver quality, or printer-specific rendering. |

## Field Validation Still Required

Run these on at least one real customer machine after updating to `v1.0.42`:

1. Open diagnostics and confirm SumatraPDF is available.
2. Confirm Ghostscript is either available or clearly shown as a warning.
3. Send a normal PDF and confirm physical output.
4. Send a password-protected PDF and provide `312830714`; confirm physical output.
5. Send a wrong PDF password; confirm no print and system alert to manager plus MY-PC owner.
6. Send JPG/JPEG/PNG and confirm physical output.
7. Send DOC/DOCX and confirm physical output when Office/Word is installed.
8. Send XLS/XLSX and PPT/PPTX only on machines with Office installed and confirm output.
9. Restart the PC during or after a queued job and confirm recovery behavior does not block later jobs.
10. Use a printer with parentheses/spaces in the name and confirm stop-printing/queue cleanup works.

## Notes

- The current evidence supports the application logic and diagnostics paths.
- The goal should remain open until at least one customer environment validates physical printing after `v1.0.42`.

