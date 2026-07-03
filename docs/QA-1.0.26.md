# QA Report - MY-PC WhatsApp Print Server 1.0.26

## Scope

- Requirement audit for production customer issues.
- System alert content sent to the configured manager and MY-PC owner number.
- Legacy Office file validation.
- Image file validation.
- UI/UX static checks from the `ui-ux-pro-max` guidance.

## Checks

- `npm run qa:smoke`
  - Builds the TypeScript project.
  - Verifies PDF password detection and validation.
  - Verifies encrypted PDF page counting with password `312830714`.
  - Verifies system alert text includes job id, customer, phone, file, size, printer, server and computer data.
  - Verifies default licensed file types include Word, Excel, PowerPoint, TXT, images and PDF.
  - Verifies legacy `.doc` CFB files are accepted when file type is allowed.
  - Verifies JPEG content is accepted as `jpeg`.
  - Verifies UI basics: Rubik font, focus-visible, reduced motion, responsive media and no global horizontal scroll.

## Notes

- Physical printer output still requires customer-side validation because Windows drivers and printer firmware vary by site.
- Existing failed jobs from older versions are not automatically reprinted after update.
