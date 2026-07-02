import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AppConfig, FieryHotFolderEntry, IncomingAttachment, PrinterProfileConfig } from "./types.js";
import { PrinterManager } from "./printerCompatibility.js";

const execFileAsync = promisify(execFile);

export interface FieryHotFolderRouting {
  profile: PrinterProfileConfig;
  folders: FieryHotFolderEntry[];
  isFiery: boolean;
}

export async function getFieryHotFolderRouting(config: AppConfig): Promise<FieryHotFolderRouting | undefined> {
  const profile = getActivePrinterProfile(config);
  if (!profile?.printerName || !profile.fieryHotFolders?.enabled) {
    return undefined;
  }

  const printer = await PrinterManager.getPrinter(profile.printerName).catch(() => undefined);
  const isFiery = Boolean(printer?.isFiery || /fiery|electronics\s+for\s+imaging|\befi\b|\bsc12c\b/i.test(
    `${profile.printerName} ${printer?.driverName ?? ""} ${printer?.manufacturer ?? ""}`
  ));
  if (!isFiery) {
    return undefined;
  }

  const folders = profile.fieryHotFolders.folders.filter((folder) => folder.enabled && folder.path.trim());
  if (folders.length === 0) {
    throw new Error("Fiery Hot Folders is enabled, but no target folders were configured.");
  }

  return { profile, folders, isFiery };
}

export async function copyAttachmentToFieryHotFolder(
  attachment: Pick<IncomingAttachment, "fileName" | "filePath">,
  folderPath: string
): Promise<string> {
  const targetDir = await resolveHotFolderPath(folderPath);
  const stats = fs.statSync(targetDir);
  if (!stats.isDirectory()) {
    throw new Error(`Fiery target is not a folder: ${targetDir}`);
  }

  const destination = uniqueDestinationPath(targetDir, attachment.fileName || path.basename(attachment.filePath));
  fs.copyFileSync(attachment.filePath, destination);
  return destination;
}

export function getActivePrinterProfile(config: AppConfig): PrinterProfileConfig | undefined {
  const profiles = Array.isArray(config.printerProfiles) ? config.printerProfiles : [];
  return (
    profiles.find((profile) => profile.isPrimary && profile.printerName === config.printerName) ??
    profiles.find((profile) => profile.printerName === config.printerName) ??
    profiles.find((profile) => profile.isPrimary) ??
    profiles[0]
  );
}

async function resolveHotFolderPath(folderPath: string): Promise<string> {
  const expanded = expandWindowsPath(folderPath.trim());
  if (!expanded) {
    throw new Error("Fiery target folder is empty.");
  }

  if (/\.lnk$/i.test(expanded)) {
    const target = await resolveShortcutTarget(expanded);
    if (!target) {
      throw new Error(`Could not resolve Fiery shortcut: ${expanded}`);
    }
    return target;
  }

  return expanded;
}

async function resolveShortcutTarget(shortcutPath: string): Promise<string> {
  const script = `
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut(${JSON.stringify(shortcutPath)})
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$shortcut.TargetPath
`;
  const { stdout } = await execFileAsync("powershell.exe", ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    maxBuffer: 1024 * 256
  });
  return stdout.trim();
}

function expandWindowsPath(value: string): string {
  return value
    .replace(/^%USERPROFILE%/i, process.env.USERPROFILE || "")
    .replace(/^%DESKTOP%/i, path.join(process.env.USERPROFILE || "", "Desktop"))
    .replace(/^~(?=$|[\\/])/, process.env.USERPROFILE || "");
}

function uniqueDestinationPath(destinationDir: string, fileName: string): string {
  const safeName = path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  const parsed = path.parse(safeName || `print-${Date.now()}`);
  let candidate = path.join(destinationDir, safeName);
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(destinationDir, `${parsed.name}-${counter}${parsed.ext}`);
    counter++;
  }

  return candidate;
}
