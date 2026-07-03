# QA Report - MY-PC WhatsApp Print Server 1.0.28

Date: 2026-07-03

## Focus

- Added static UI/UX regression coverage for the current dark RTL dashboard.
- Verified that client cache versions are tied to `package.json` so browser updates do not keep stale UI files.
- Kept the previous production failure coverage for encrypted PDFs, Ghostscript/Sumatra fallback, Word container validation, image validation, owner alerts, startup recovery, and queue cleanup.

## UI/UX Checks Added

- `public/index.html` must load in Hebrew RTL and include accessible live toast notifications.
- `public/index.html`, `public/sw.js`, and `package.json` versions must match.
- Rubik must remain the system font with `font-display: swap`.
- Focus-visible, reduced-motion, responsive breakpoints, and stable table sizing must remain present.
- Lucide initialization must stay guarded so the UI still renders if the icon script is unavailable.
- Update status text now has a QA guard for missing DOM nodes.
- Printer profiles must keep the tabbed UI structure.

## Customer Issue Coverage Still Included

- Password-protected PDF flow:
  - detect encrypted PDF,
  - ask the customer for the password,
  - reject wrong password without printing,
  - accept password `312830714`,
  - keep the job out of the print queue until the customer confirms printing.
- PDF printing dry-run with Hebrew filenames, spaces, and printer names with parentheses.
- Ghostscript missing fallback to SumatraPDF.
- Legacy `.doc` CFB container acceptance.
- JPEG validation.
- Owner system alerts to `972522250223` with job, customer, file, printer, and computer context.

## Notes

This QA pass does not prove physical output from customer printers. Olivetti, Samsung/Xerox-compatible queues, and encrypted PDFs still need one live print confirmation per customer environment.
