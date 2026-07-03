# QA 1.0.41

## Scope

Version 1.0.41 fixes stale browser UI after cloud updates.

The customer symptom was that the backend was already updated, but the browser still loaded an older dashboard shell and older asset query strings from the Service Worker cache.

## Changes Verified

- The application version is declared in `public/app.js` as `APP_VERSION`.
- Service Worker registration uses the current package version.
- Service Worker update checks bypass browser cache with `updateViaCache: "none"`.
- HTML navigation requests are never cached by the Service Worker.
- The Service Worker no longer precaches `/`.
- The app compares the loaded UI version with `/api/status.version`.
- If the UI is stale, the app updates/removes its local app cache and reloads with the server version in the URL.

## Expected Result

After an update, users should not remain stuck on an old dashboard or an old CSS/JS shell. A refresh or navigation to `http://localhost:3010` should load the current server version.

## Manual Customer Check

1. Open `http://localhost:3010`.
2. Confirm `/api/status` returns the new version.
3. Confirm the loaded HTML references `/styles.css?v=1.0.41` and `/app.js?v=1.0.41`.
4. If an old version is shown, refresh once; the app should clear its own app cache and reload cleanly.

