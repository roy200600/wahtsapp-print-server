# QA 1.0.44

## Scope

- Keep the in-app customer QA export aligned with the running server version.
- Include minimum diagnostics version and recommended version in the exported report.
- Preserve encrypted PDF handling: password-protected files wait for a valid password before printing.
- Preserve legacy Office validation for CFB `.doc`, `.xls`, and `.ppt` files.

## Checks

- `npm run qa:smoke`
- Verified the bundled encrypted PDF fixture accepts password `312830714` and rejects an incorrect password.
- Verified the UI asset versions, service worker cache name, and app runtime version all match `1.0.44`.

## Field Notes

- A PDF that reports `Encrypted: yes` must not print until the customer sends the password.
- If Windows reports a printer as unavailable, paused, offline, or requiring intervention, the job should fail with a clear printer availability reason.
- Queue warnings alone should not block printing in the current compatibility layer.
