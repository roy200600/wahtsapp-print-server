# QA 1.0.54

## Scope

- Improve customer-side QA reports for field validation.
- Detect when the selected app printer no longer exists in Windows.
- Include the manual physical-print checklist inside the generated JSON report.

## Customer Issue Covered

Several customer issues can only be proven on the real machine with the real printer. The previous QA report confirmed server, engines, paths, Node.js, and printer-list access, but did not explicitly prove that the configured printer name still exists in Windows or tell the technician exactly which paper-output tests remain.

This release adds:

- `selectedPrinter` check: passed, warning, or failed.
- `fieldValidationChecklist` in every `customer-qa-*.json` report.
- Updated runbook wording for `v1.0.54`.

## Checks

- `npm run qa:smoke`
- Static QA verifies `customer-qa.ps1` includes `selectedPrinter` and `fieldValidationChecklist`.
- Static QA verifies the runbook has a required physical confirmation section.
