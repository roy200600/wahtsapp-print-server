import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import type { AppConfig, FieryHotFolderDestination, PrintLogEntry, PrinterProfileConfig } from "./types.js";
import { getPowerShellPath } from "./powershell.js";

export interface FieryPendingJob {
  code: string;
  customerPhone: string;
  customerName: string;
  customerJid: string;
  files: PrintLogEntry[];
  pages: number;
  profile: PrinterProfileConfig;
  createdAt: number;
}

export interface FieryCopyResult {
  destination: FieryHotFolderDestination;
  copiedFiles: string[];
}

export function getPrimaryFieryProfile(config: AppConfig): PrinterProfileConfig | undefined {
  const profiles = Array.isArray(config.printerProfiles) ? config.printerProfiles : [];
  const primary = profiles.find((profile) => profile.isPrimary) || profiles[0];
  return primary?.printerType === "fiery" ? primary : undefined;
}

export function getActiveFieryDestinations(profile: PrinterProfileConfig): FieryHotFolderDestination[] {
  return (profile.fieryDestinations || [])
    .filter((destination) => destination.enabled !== false && destination.folderPath.trim())
    .map((destination, index) => ({
      ...destination,
      id: destination.id || `fiery-${index + 1}`,
      label: destination.label || `Fiery ${index + 1}`
    }));
}

export function renderFieryManagerPrompt(job: FieryPendingJob): string {
  const destinations = getActiveFieryDestinations(job.profile);
  const lines = [
    "🔥 בחירת יעד Fiery",
    "",
    "התקבלה עבודה חדשה להדפסה.",
    "",
    `עבודה: ${job.code}`,
    `לקוח: ${job.customerName || "לקוח"}`,
    `טלפון: ${job.customerPhone}`,
    `קבצים: ${job.files.length}`,
    `עמודים: ${job.pages}`,
    "",
    "בחר לאיזה יעד לשלוח:"
  ];

  destinations.forEach((destination, index) => {
    lines.push(`${index + 1} - ${destination.label}`);
  });

  lines.push("", `להקליד: ${job.code} 1`, "אם זו העבודה היחידה אפשר להקליד מספר בלבד.", "לביטול: ביטול הדפסה");
  return lines.join("\n");
}

export function parseFieryManagerReply(text: string): { code?: string; selection?: number; cancel: boolean } {
  const normalized = text.trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  const cancel = ["ביטול", "בטל", "ביטול הדפסה", "cancel", "stop"].some((word) => lower.includes(word));
  const code = normalized.match(/\bF-\d{4,6}\b/i)?.[0]?.toUpperCase();
  const selection = Number(normalized.match(/\b\d{1,2}\b/)?.[0] || 0);
  return {
    code,
    selection: Number.isFinite(selection) && selection > 0 ? selection : undefined,
    cancel
  };
}

export function copyFieryFiles(job: FieryPendingJob, destination: FieryHotFolderDestination): FieryCopyResult {
  const targetDir = resolveFieryDestinationPath(destination);
  if (!targetDir) {
    throw new Error("Fiery destination folder is empty.");
  }
  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    throw new Error(`Fiery destination folder was not found: ${targetDir}`);
  }

  const copiedFiles: string[] = [];
  for (const file of job.files) {
    const targetPath = uniqueDestinationPath(targetDir, file.fileName || path.basename(file.filePath));
    fs.copyFileSync(file.filePath, targetPath);
    copiedFiles.push(targetPath);
  }

  return { destination, copiedFiles };
}

function resolveFieryDestinationPath(destination: FieryHotFolderDestination): string {
  const folderPath = destination.folderPath.trim();
  if (folderPath && path.extname(folderPath).toLowerCase() !== ".lnk") {
    return folderPath;
  }

  const shortcutPath = path.extname(folderPath).toLowerCase() === ".lnk"
    ? folderPath
    : (destination.shortcutPath || "").trim();
  if (!shortcutPath) {
    return folderPath;
  }
  if (path.extname(shortcutPath).toLowerCase() !== ".lnk") {
    return shortcutPath;
  }

  try {
    const script = [
      "$OutputEncoding=[System.Text.Encoding]::UTF8",
      `[Console]::OutputEncoding=[System.Text.Encoding]::UTF8`,
      `$shortcut=${JSON.stringify(shortcutPath)}`,
      "$shell=New-Object -ComObject WScript.Shell",
      "$link=$shell.CreateShortcut($shortcut)",
      "Write-Output $link.TargetPath"
    ].join("; ");
    return execFileSync(getPowerShellPath(), ["-NoProfile", "-Command", script], { encoding: "utf8" }).trim();
  } catch {
    return folderPath || shortcutPath;
  }
}

export function createFieryJobCode(): string {
  return `F-${Math.floor(1000 + Math.random() * 9000)}`;
}

function uniqueDestinationPath(destinationDir: string, fileName: string): string {
  const safeName = path.basename(fileName).replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
  const parsed = path.parse(safeName);
  let candidate = path.join(destinationDir, safeName);
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(destinationDir, `${parsed.name}-${counter}${parsed.ext}`);
    counter++;
  }

  return candidate;
}
