# QA 1.0.59

## Scope

Prevent customers from receiving internal system alerts for their own print jobs.

## Customer Issue

When the tester/customer phone was also configured as an alert recipient or matched the owner phone, the same WhatsApp account could receive both:

- customer-facing print messages
- internal system error alerts

## Fix

- System alerts now automatically remove the job customer phone from alert recipients.
- The comparison supports both local Israeli format, such as `0522250223`, and international format, such as `972522250223`.
- Owner alerts are still sent unless the owner phone is also the customer phone for that specific job.

## Checks

- QA verifies that configured alert phone `972500000000` is skipped when the customer phone is `0500000000`.
- QA verifies that owner phone `972522250223` is skipped when the customer phone is `0522250223`.
- Full `scripts/qa-smoke.ps1`.

## Field Validation

- Send a failing job from a regular customer number.
- Confirm the customer receives only customer-facing messages.
- Confirm internal alerts are received only by non-customer alert recipients.
