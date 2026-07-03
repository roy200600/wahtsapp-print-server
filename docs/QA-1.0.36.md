# QA 1.0.36

## Scope

- Improved diagnostics for rare print failures that arrive as an empty thrown object.
- System alerts and logs now include a clear unknown-error message plus technical metadata instead of `error: {}`.
- Kept PDF password handling unchanged: encrypted PDFs are held until a valid password is supplied.

## Verification

- `npm run qa:smoke`
- Static QA now checks empty thrown-object diagnostics.
- PDF password smoke checks continue to verify password extraction, wrong password rejection, and valid password acceptance.

## Notes

- The encrypted PDF sample supplied by the customer is expected to require the password before printing.
- Physical print output still requires validation on each customer printer model and driver.
