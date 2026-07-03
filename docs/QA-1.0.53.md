# QA 1.0.53

## Scope

- Harden startup recovery after a PC is shut down or restarted during printing.
- Move orphaned `received` and `printing` jobs to `failed` more reliably.
- Retry locked-file moves and fall back to copy/unlink when rename is blocked.

## Customer Issue Covered

A customer shut down the PC while a print was in progress. On startup, old documents were recovered as failed, but later jobs became stuck. Startup recovery must be conservative and clean: mark interrupted jobs as failed, clear the app spooler jobs, and avoid leaving file moves half-complete when Windows or Office still holds a handle.

This release gives the database recovery path the same locked-file tolerance used by normal print processing.

## Checks

- `npm run qa:smoke`
- Static QA verifies `recoverInterruptedJobs` uses `moveInterruptedJobFile`, retryable file errors, and `copyFileSync` fallback.
- Runtime QA verifies `received` and `printing` records are recovered as failed and their source files are moved to the failed folder.
