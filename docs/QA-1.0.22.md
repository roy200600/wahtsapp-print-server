# QA Report - MY-PC WhatsApp Print Server 1.0.22

## Scope

- Added a non-printing `DryRun` mode to the PDF profile script for QA.
- Verified relative SumatraPDF paths are resolved before PDF printing.
- Verified printer names with spaces and parentheses are quoted correctly.
- Verified PDF file paths with Hebrew characters and spaces are copied to a safe temporary `document.pdf` path before SumatraPDF is invoked.
- Added static UI/UX smoke checks for Rubik font, visible focus states, reduced-motion support, responsive CSS, and horizontal overflow protection.

## Automated Checks

- `npm run build`
- `npm run qa:smoke`

## Notes

This release keeps the runtime fixes from 1.0.21 and adds stronger regression coverage around the customer PDF failures seen in the field.
