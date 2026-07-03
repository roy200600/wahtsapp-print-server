# QA 1.0.40

## Scope

- Strengthened PDF password QA so it no longer depends on optional local Python packages.
- Added a committed encrypted PDF fixture for repeatable password-protected PDF validation.

## Changes

- Added `tests/fixtures/encrypted-password-312830714.pdf`.
- `scripts/qa-smoke.ps1` now always verifies:
  - encrypted PDF detection
  - wrong password rejection
  - correct password acceptance
  - page counting with the supplied password
  - customer password prompt flow
  - wrong-password system alerts to both manager and MY-PC owner number

## Verification

- `npm run qa:smoke` must fail if the encrypted PDF fixture is missing or password handling regresses.

## Remaining Field Validation

- Physical printing still depends on the customer's Windows printer driver and must be validated per printer site.
