# QA Report - MY-PC WhatsApp Print Server 1.0.21

## Scope

- Harden failed-file handling when Windows or Office keeps a document locked.
- Treat old Office binary documents (`doc`, `xls`, `ppt`) as valid CFB containers.
- Keep legacy full-license installs from staying limited to PDF/images only.
- Avoid blocking prints only because an old Windows queue job reports an error.
- Harden the legacy PDF script so SumatraPDF failures include a real exit code.
- Add password text parsing for natural Hebrew text such as "הסיסמה היא: 312830714".

## Automated Checks

- `npm run build`
- `npm run qa:smoke`
- PowerShell syntax validation for the PDF scripts

## Customer-Side Validation Still Required

- Physical print on the customer printer after updating to 1.0.21.
- One protected PDF with the correct password.
- One legacy `.doc` file under a licensed installation.
- Printer compatibility check while the queue has an old failed job.
