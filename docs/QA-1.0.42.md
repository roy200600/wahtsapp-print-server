# QA 1.0.42

## Scope

Version 1.0.42 adds a print-engine diagnostics check for customer machines.

This targets field failures where PDF jobs failed because Ghostscript or SumatraPDF were missing, outdated, or not installed in the expected local tools folder.

## Changes Verified

- Added `/api/diagnostics/print-engines`.
- The endpoint reports SumatraPDF path, availability, and source.
- The endpoint reports Ghostscript path, availability, and source.
- Missing Ghostscript is reported as a warning because PDF printing can still fall back to SumatraPDF.
- Missing SumatraPDF is reported as a blocking issue for PDF fallback.
- The diagnostics page now shows a "בדיקת מנועי הדפסה" card.
- The card is responsive and uses the existing dark dashboard styling.

## Expected Result

Technicians can open the diagnostics page before testing a customer printer and immediately see whether the local PDF print engines are available.

This makes customer failures such as `Ghostscript was not found` visible before the next print job fails.

