# QA 1.0.47

## Scope

- Restart stale MY-PC server processes when the running `/api/status.version` does not match the installed package version.
- Ensure startup shortcuts created from the UI use `scripts/start-windows.ps1` instead of launching `node dist/main.js` directly.
- Prevent old server processes from surviving after updates, Windows startup, or shortcut launches.

## Customer Issue Covered

Some customer machines can keep an old Node.js server process alive on port `3010`. The dashboard then looks available, but routes from the new release can be missing. This release makes the starter script compare the running server version to the installed version and restart project server processes when they differ.

## Checks

- `npm run qa:smoke`
- Static checks verify `start-windows.ps1` detects running server version mismatches.
- Static checks verify generated startup scripts call `start-windows.ps1 -Hidden`.
