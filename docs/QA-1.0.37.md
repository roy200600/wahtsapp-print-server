# QA 1.0.37

## Scope

- Fixed a stale Service Worker registration cache-buster in the browser app.
- The app shell, stylesheet, script URL, and service worker cache now all track the package version together.
- Added QA coverage so future releases fail if the Service Worker registration points to an old version.

## Verification

- `npm run qa:smoke`
- Static UI cache checks compare `package.json` version against:
  - `public/index.html` stylesheet version
  - `public/index.html` app script version
  - `public/app.js` service worker registration version
  - `public/sw.js` cache name

## Notes

- This reduces cases where a customer browser keeps an older interface after a cloud update.
- Physical print output still requires validation on each customer printer model and driver.
