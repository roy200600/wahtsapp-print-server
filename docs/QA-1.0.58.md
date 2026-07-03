# QA 1.0.58

## Scope

Fix password-protected PDF printing when SumatraPDF is configured with an absolute path.

## Customer Failure

A customer PDF failed with:

- `Ghostscript: Cannot bind argument to parameter 'Path' because it is null.`
- `SumatraPDF print failed with exit code 3`

The job included `-PdfPassword 312830714`, so the password was being passed correctly.

## Root Cause

`scripts/print-pdf-profile.ps1` only initialized `$ProjectRoot` when the SumatraPDF path was relative. When SumatraPDF was already an absolute path, Ghostscript discovery later used a null `$ProjectRoot` and failed before compatibility printing could render the PDF.

## Fix

- `$ProjectRoot` is now initialized unconditionally before SumatraPDF path normalization.
- QA now checks that this assignment exists in the PDF profile script.

## Checks

- Dry-run against the attached password-protected PDF with password `312830714`.
- Full `scripts/qa-smoke.ps1`.

## Field Validation

- Re-send the same password-protected PDF and reply with `312830714`.
- Confirm physical output on the Xerox B205 printer.
