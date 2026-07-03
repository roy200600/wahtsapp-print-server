# QA 1.0.55

## Scope

- Add a frontend readiness check to customer QA reports.
- Detect customer machines where the server responds but the dashboard HTML or static asset references are missing.
- Improve UX/UI validation evidence without requiring an automated browser install.

## Customer Issue Covered

Some failures look like "the app is open but the screen is blank" or "the server is running but the UI is stale." The previous customer QA script checked APIs and engines, but did not fetch the dashboard HTML.

This release adds a `frontend` check that requests `/` and verifies these markers:

- RTL dashboard HTML
- `/app.js?v=...`
- `/styles.css?v=...`
- `MY-PC`

## Checks

- `npm run qa:smoke`
- `scripts/customer-qa.ps1` includes `Invoke-Text`.
- Customer QA report includes a `frontend` check.
