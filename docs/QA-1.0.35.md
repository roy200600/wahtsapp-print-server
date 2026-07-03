# QA 1.0.35

## Scope

- Clarified rejected Office/TXT/CSV file messages while the system is in trial mode.
- Trial mode remains unchanged: PDF/JPG/JPEG/PNG only, one printer, grayscale, daily limits.
- Added QA coverage so the trial file-type explanation remains present.

## Verification

- `npm run qa:smoke`
- UI browser check on `http://localhost:3010/`:
  - page loads without console errors on the login screen
  - Hebrew/RTL attributes are active
  - main navigation items are present
  - MY-PC logo assets are present

## Notes

- The DOC rejection seen in customer logs is expected in trial mode. Licensed mode supports DOC/DOCX/RTF/TXT/CSV/XLS/XLSX/PPT/PPTX according to the default configuration.
- Physical print output still requires validation on each customer printer model and driver.
