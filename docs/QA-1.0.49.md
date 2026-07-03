# QA 1.0.49

## Scope

- Stop stale local server processes after an update when Node reports the script path as `dist/main.js`.
- Normalize process command lines before checking for the project server.
- Keep the diagnostics endpoint probe from 1.0.48 as the second stale-server safety check.

## Customer Issue Covered

On some Windows machines, the running Node process command line contains `dist/main.js` with forward slashes, while the stale-process detector searched for `dist\main.js`. The updater then detected that the old server was stale, but could not stop it, leaving port 3010 blocked and newer API routes unavailable.

## Checks

- `npm run qa:smoke`
- Static checks verify the startup script normalizes `/` to `\` before matching the server command line.
