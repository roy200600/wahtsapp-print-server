# QA Report - MY-PC WhatsApp Print Server 1.0.20

## Additional Scope

This pass extends the 1.0.19 QA work with customer-facing Office/Image hardening and a repeatable smoke test.

## Fixes Included

- Legacy Office validation:
  - `.doc`, `.xls` and `.ppt` files may be detected as `cfb` by binary sniffing.
  - These are now accepted when the matching file type is allowed by the license/config.
- Image printing:
  - JPEG/PNG printing now honors common EXIF orientation metadata before sending to Windows printing.
  - This helps phone photos print in the expected rotation.
- QA automation:
  - Added `npm run qa:smoke`.
  - The smoke script runs TypeScript build, PowerShell syntax checks, Rubik/font/cache checks and PDF security checks.
  - The PDF security check uses Unicode escapes so it works on Windows consoles that are not UTF-8.

## Automated Checks Completed

- `npm run qa:smoke`: passed.
- This includes:
  - `npm run build`.
  - PowerShell syntax validation for print/install/update scripts.
  - PDF encrypted-file detection smoke test.
  - Hebrew/English password parsing smoke test.
  - Required UI asset checks.

## Physical QA Still Required

- Print `.doc`, `.xls` and `.ppt` files on a licensed system with Microsoft Office installed.
- Print phone photos with rotated EXIF metadata.
- Print password-protected PDF with correct and wrong passwords on a real printer.
- Verify customer/admin WhatsApp alert delivery on a connected production WhatsApp session.
