# QA 1.0.30

## Scope

- Added application version metadata to WhatsApp system alerts.
- Routed WhatsApp startup failures, uncaught exceptions, and unhandled promise rejections through the shared detailed error formatter.
- Kept the existing print, WhatsApp, database, and IPC flows unchanged.

## Verification

- `npm run qa:smoke`
- Static QA verifies that system alerts include `App version`.
- Alert smoke test verifies that formatted alerts include the current `package.json` version.
- Error details smoke test verifies command, stdout, stderr, and technical details are preserved.
- Encrypted PDF order flow QA remains covered with password `312830714`.

## Notes

- This update improves field diagnostics only. It does not change how customer jobs are accepted, queued, or printed.
- Physical printer validation is still required on the customer printer.
