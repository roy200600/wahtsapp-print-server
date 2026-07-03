# QA 1.0.57

## Scope

This release hardens cloud updates after reports that update detection works but the actual update does not complete clearly on customer machines.

## Changes Covered

- The update runner now creates `logs/update-status.json`.
- The update runner now writes the latest update output to `logs/update-latest.log`.
- The updater is launched through a wrapper that records `running`, `completed`, and `failed` states.
- If the update fails after the server was stopped, the wrapper tries to restart the existing server.
- A new `/api/updates/status` endpoint exposes the latest update state to the UI.
- The advanced update panel shows the latest update status and log path.

## Checks

- TypeScript build.
- Full `scripts/qa-smoke.ps1`.
- Local server restart and `/api/status` version verification.
- `/api/updates/status` verification.

## Field Validation

- On a customer machine with an older version, click update and confirm the machine reaches `1.0.57`.
- If the update fails, collect `logs/update-latest.log` and `logs/update-status.json`.
