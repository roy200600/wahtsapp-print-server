# QA 1.0.48

## Scope

- Detect stale server processes that falsely report the latest version by reading the updated `package.json`.
- Treat a missing `/api/diagnostics/print-engines` endpoint as proof that the running server is stale.
- Restart project server processes when either the version mismatches or diagnostics are missing.

## Customer Issue Covered

Old server processes from releases before compiled build-version reporting can still read the new package version from disk. They may report the latest version while missing newer API routes. This release checks for the diagnostics endpoint as a capability probe before deciding that an existing server is valid.

## Checks

- `npm run qa:smoke`
- Static checks verify `start-windows.ps1` probes `/api/diagnostics/print-engines` before reusing a running server.
