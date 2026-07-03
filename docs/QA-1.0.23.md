# QA Report - MY-PC WhatsApp Print Server 1.0.23

## Scope

- Replaced SumatraPDF-based password verification with PDF.js verification.
- Verified a real encrypted PDF rejects the wrong password and accepts the correct password `312830714`.
- Kept SumatraPDF as the print engine, with `-pwd` passed only after PDF.js confirms the password.
- Added `pdfjs-dist` as a runtime dependency for encrypted PDF validation.
- Enforced Node.js `22.13.0+` in install, update and start scripts so customers with old Node.js do not run an incompatible runtime.

## Automated Checks

- `npm run build`
- `npm run qa:smoke`
- `npm run qa:smoke` with `MYPC_QA_PYTHON` pointing to a Python runtime that includes `pypdf`, to generate a real encrypted PDF test file.

## Field Notes

SumatraPDF remains useful for silent printing, but it did not reliably validate encrypted PDF passwords in headless `-bench` mode. PDF.js now owns the password validation step.
