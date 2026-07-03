# QA Report - MY-PC WhatsApp Print Server 1.0.27

## Scope

- End-to-end password-protected PDF order flow without sending a real print job.

## Checks

- `npm run qa:smoke`
  - Creates a real encrypted PDF when Python `pypdf` is available.
  - Sends the encrypted PDF through `PrintOrderManager`.
  - Confirms the customer receives a password request before printing.
  - Confirms a wrong password fails the job and clears the pending order.
  - Confirms password `312830714` is accepted.
  - Confirms the job is not queued for printing until the customer explicitly sends the print command.
  - Restores the local print database after the test.

## Notes

- This verifies the application workflow around encrypted PDFs without requiring a physical printer.
- Physical output validation remains site-dependent.
