# QA 1.0.31

## Scope

- Reduced noisy customer-message errors when WhatsApp is disconnected.
- Kept real customer-message failures logged as errors.
- Kept the existing WhatsApp, print queue, PDF password, database, and IPC flows unchanged.

## Verification

- `npm run qa:smoke`
- Static QA verifies throttled disconnected WhatsApp logging in `PrintOrderManager`.
- Existing encrypted PDF order flow QA remains covered with password `312830714`.
- Existing UI, printer queue, PDF profile, Word/image/file validation, and alert-format smoke checks remain active.

## Notes

- This update does not retry or print orphaned customer jobs by itself.
- Physical printer validation is still required on the customer printer.
