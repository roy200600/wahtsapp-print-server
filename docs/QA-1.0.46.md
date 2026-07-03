# QA 1.0.46

## Scope

- Make `/api/status.version` report the version of the code currently running in memory.
- Prevent stale server processes from appearing current just because `package.json` was updated on disk.
- Make system alerts report the same compiled build version.

## Customer Issue Covered

A customer machine can keep an old Node.js process running after files are updated. Before this release, that stale process could read the new `package.json` from disk and report the new version even though its loaded routes and logic were old. This made diagnostics misleading, especially when new endpoints such as `/api/diagnostics/print-engines` were missing from the running process.

## Checks

- `npm run qa:smoke`
- Static UI/version checks verify `package.json`, `public/app.js`, `public/index.html`, `public/sw.js`, and `src/version.ts` are aligned.
- Dynamic smoke verifies `getCurrentVersion()` returns the compiled `APP_VERSION`.
