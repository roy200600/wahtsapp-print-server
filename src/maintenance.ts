import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { appPaths, rootDir } from "./paths.js";

const execFileAsync = promisify(execFile);
const startupShortcutName = "WhatsApp Print Server.lnk";
const registryRunName = "WhatsAppPrintServer";

export function cleanupPrintedFiles(): { deleted: number; errors: Array<{ file: string; error: string }> } {
  fs.mkdirSync(appPaths.printedDir, { recursive: true });
  let deleted = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (const entry of fs.readdirSync(appPaths.printedDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const filePath = path.join(appPaths.printedDir, entry.name);
    try {
      fs.unlinkSync(filePath);
      deleted += 1;
    } catch (error) {
      errors.push({
        file: entry.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { deleted, errors };
}

export function cleanupPrintedFilesOlderThan(days: number): { deleted: number; errors: Array<{ file: string; error: string }> } {
  fs.mkdirSync(appPaths.printedDir, { recursive: true });
  let deleted = 0;
  const errors: Array<{ file: string; error: string }> = [];
  const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;

  for (const entry of fs.readdirSync(appPaths.printedDir, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }

    const filePath = path.join(appPaths.printedDir, entry.name);
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs > cutoff) {
        continue;
      }
      fs.unlinkSync(filePath);
      deleted += 1;
    } catch (error) {
      errors.push({
        file: entry.name,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { deleted, errors };
}

export function getStartupStatus(): { enabled: boolean; shortcutPath: string } {
  const shortcutPath = getStartupShortcutPath();
  return { enabled: fs.existsSync(shortcutPath) || hasRegistryRunEntry(), shortcutPath };
}

export async function enableStartup(): Promise<{ enabled: boolean; shortcutPath: string }> {
  fs.mkdirSync(path.join(rootDir, "scripts"), { recursive: true });
  fs.writeFileSync(getStartupScriptPath(), startupScriptContent(), "utf8");

  const shortcutPath = getStartupShortcutPath();
  const scriptPath = getStartupScriptPath();
  const powershellPath = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
  const argumentsText = `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}"`;

  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    [
      "$shell = New-Object -ComObject WScript.Shell",
      `$shortcut = $shell.CreateShortcut(${JSON.stringify(shortcutPath)})`,
      `$shortcut.TargetPath = ${JSON.stringify(powershellPath)}`,
      `$shortcut.Arguments = ${JSON.stringify(argumentsText)}`,
      `$shortcut.WorkingDirectory = ${JSON.stringify(rootDir)}`,
      "$shortcut.WindowStyle = 7",
      "$shortcut.Save()"
    ].join("; ")
  ]);

  return getStartupStatus();
}

export function disableStartup(): { enabled: boolean; shortcutPath: string } {
  fs.rmSync(getStartupShortcutPath(), { force: true });
  removeRegistryRunEntry();
  return getStartupStatus();
}

function getStartupShortcutPath(): string {
  return path.join(
    os.homedir(),
    "AppData",
    "Roaming",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    startupShortcutName
  );
}

function getStartupScriptPath(): string {
  return path.join(rootDir, "scripts", "start-server-hidden.ps1");
}

function hasRegistryRunEntry(): boolean {
  try {
    const output = execFileSync("reg.exe", [
      "query",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
      "/v",
      registryRunName
    ]);
    return output.toString("utf8").includes(registryRunName);
  } catch {
    return false;
  }
}

function removeRegistryRunEntry(): void {
  try {
    execFileSync("reg.exe", [
      "delete",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
      "/v",
      registryRunName,
      "/f"
    ]);
  } catch {
    // Missing registry entries are fine; the Startup shortcut is the primary mechanism.
  }
}

function startupScriptContent(): string {
  return [
    "$ErrorActionPreference = \"Stop\"",
    `$project = ${JSON.stringify(rootDir)}`,
    "Set-Location -LiteralPath $project",
    "$node = (Get-Command node.exe -ErrorAction Stop).Source",
    "Start-Process -FilePath $node -ArgumentList @('dist/main.js') -WorkingDirectory $project -WindowStyle Hidden"
  ].join("\r\n");
}
