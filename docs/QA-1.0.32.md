# QA 1.0.32

## Scope

- Added non-printing `-DryRun` support to image, text, Word, Excel, and PowerPoint print scripts.
- Expanded smoke QA to verify those scripts preserve file paths, complex printer names, copy counts, and selected print engines without sending jobs to a physical printer.
- Kept the existing print execution flow unchanged.

## Verification

- `npm run qa:smoke`
- Dry-run QA covers:
  - Image printing through `System.Drawing`.
  - Text printing through `System.Drawing`.
  - Word printing through `Word.Application`.
  - Excel printing through `Excel.Application`.
  - PowerPoint printing through PowerPoint export and the PDF profile path.
- Existing encrypted PDF order flow QA remains covered with password `312830714`.
- Existing alert, UI, printer queue, PDF profile, and file-validation checks remain active.

## Notes

- Dry-run checks do not prove physical printer output. They prove command/script wiring before customer machines perform real printer validation.
