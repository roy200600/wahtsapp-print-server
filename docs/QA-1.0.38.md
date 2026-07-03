# QA 1.0.38

## Scope

- Added QA coverage for password-protected PDF failure alerts.
- The encrypted PDF flow now proves that a wrong password does not continue to printing.
- The same QA verifies that the manager alert phone and MY-PC owner phone both receive the system alert.

## Verification

- `npm run qa:smoke`
- The encrypted PDF order-flow smoke now checks:
  - password prompt is sent to the customer
  - wrong password fails the order
  - the failed order is removed from the pending flow
  - system alert recipients include the configured manager and `972522250223`
  - alert text includes customer, file, printer, and failure reason

## Notes

- This is a QA hardening release. Runtime behavior stays aligned with the current password-protected PDF implementation.
- Physical print output still requires validation on each customer printer model and driver.
