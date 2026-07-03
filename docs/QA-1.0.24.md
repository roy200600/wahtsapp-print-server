# QA Report - MY-PC WhatsApp Print Server 1.0.24

## Scope

- Failed-file recovery after Windows or Office keeps a document locked.
- Password-protected PDF handling with the customer password flow.
- PDF page counting after a password is supplied.

## Checks

- `npm run qa:smoke`
  - Builds the TypeScript project.
  - Verifies PowerShell print scripts parse successfully.
  - Creates an encrypted PDF during QA when Python `pypdf` is available.
  - Confirms a wrong PDF password is rejected.
  - Confirms password `312830714` opens the encrypted PDF.
  - Confirms encrypted PDF page counting works after the password is supplied.

## Notes

- Failed files now use a copy fallback if Windows refuses to rename a locked file.
- PDF page counts now prefer PDF.js instead of raw text scanning, with a safe fallback for damaged files.
