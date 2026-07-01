# MY-PC WhatsApp Print Server

Windows print server that receives files through WhatsApp Web, validates them, queues them, and prints them to a selected Windows printer.

## Features

- WhatsApp Web connection with QR code using Baileys.
- Local Hebrew RTL management dashboard.
- Windows printer selection and compatibility display.
- Multiple printer profiles: primary, black and white, color, and special printers.
- Per-printer PDF and Office print settings.
- File support: PDF, JPG, JPEG, PNG, DOC, DOCX, RTF, TXT, CSV, XLS, XLSX, PPT, PPTX.
- Customer WhatsApp message templates.
- System WhatsApp alerts.
- Print log, saved printed files view, diagnostics log view.
- Optional startup on Windows login.
- PWA support for local app shortcut behavior.

## Requirements

- Windows 10 / Windows 11 / Windows Server.
- Node.js LTS.
- A Windows printer already installed with a working driver.
- Optional: SumatraPDF portable or installed version for PDF printing.

## Quick Install On Windows

After the repository is uploaded to GitHub, run PowerShell:

```powershell
irm https://raw.githubusercontent.com/roy200600/wahtsapp-print-server/main/scripts/install-windows.ps1 | iex
```

The installer will:

- Download the project when needed.
- Install Node dependencies.
- Build the app.
- Create runtime folders.
- Create a clean `config/settings.json` from `config/settings.example.json`.
- Add a Startup shortcut so the server starts when Windows starts.
- Start the server in the background.

Open:

```text
http://localhost:3010
```

## Manual Install

```powershell
git clone https://github.com/roy200600/wahtsapp-print-server.git
cd wahtsapp-print-server
npm install
npm run build
npm start
```

Or with the Windows helper:

```powershell
npm run install:windows
```

## Start Manually On Windows

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-windows.ps1
```

Start hidden in background:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-windows.ps1 -Hidden
```

## Remove Startup Shortcut

```powershell
npm run uninstall:windows
```

This removes only the Windows Startup shortcut. It does not delete project files or customer data.

## Clean Repository Notes

These folders are runtime-only and are ignored by Git:

- `auth`
- `data`
- `downloads`
- `printed`
- `failed`
- `temp`
- `logs`
- `dist`
- `node_modules`

Local settings are also ignored:

- `config/settings.json`

Commit this clean template instead:

- `config/settings.example.json`

## First Setup

1. Open `http://localhost:3010`.
2. Set an admin password.
3. Scan the WhatsApp QR code.
4. Select printers in settings.
5. Add allowed phone numbers or groups.
6. Save settings.

## Important

This project uses WhatsApp Web through Baileys. It is not an official WhatsApp Business API integration. WhatsApp may disconnect the session or require QR reconnection.
