# QA 1.0.52

## Scope

- Harden Office printing cleanup for Word, Excel, and PowerPoint.
- Reduce file-lock failures such as `EBUSY` after Office print attempts.
- Keep Word printing synchronous enough that the script does not immediately release the source file while Word is still submitting the job.

## Customer Issue Covered

Customer logs showed file move failures after Office documents, including `EBUSY: resource busy or locked`. Office COM automation can leave document handles open if COM objects are only closed but not explicitly released. Word can also print in the background and return before the job is fully submitted.

This release:

- Uses `Document.PrintOut($false)` for Word.
- Releases Word, Excel, PowerPoint, workbook, document, and presentation COM objects.
- Forces a .NET GC/finalizer pass after Office cleanup.

## Checks

- `npm run qa:smoke`
- Static QA verifies `ReleaseComObject` in Word, Excel, and PowerPoint print scripts.
- Static QA verifies Word uses `PrintOut($false)`.
