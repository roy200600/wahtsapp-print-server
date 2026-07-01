import fs from "node:fs";
import path from "node:path";
import type { AppConfig, IncomingAttachment, PrintLogEntry } from "./types.js";
import { validateAttachment } from "./security.js";
import { printFile } from "./printer.js";
import { appPaths } from "./paths.js";
import { hasMessage, savePrintLog, setPrintStatus } from "./db.js";
import { logger } from "./logger.js";
import { savePrintDuration } from "./printMetrics.js";
import { sendSystemAlert } from "./alerts.js";

export async function processAttachment(
  attachment: IncomingAttachment,
  getConfig: () => AppConfig
): Promise<PrintLogEntry> {
  const initial = await registerAttachment(attachment, getConfig);
  if (initial.status !== "received" || !getConfig().autoPrint) {
    return initial;
  }

  return printRegisteredAttachment(initial, getConfig);
}

export async function registerAttachment(
  attachment: IncomingAttachment,
  getConfig: () => AppConfig
): Promise<PrintLogEntry> {
  const config = getConfig();
  const createdAt = new Date().toISOString();

  if (hasMessage(attachment.messageKey)) {
    return writeLog(attachment, config, createdAt, "rejected", "Duplicate message");
  }

  const validation = await validateAttachment(attachment, config);
  if (!validation.ok) {
    moveTo(attachment.filePath, appPaths.failedDir);
    sendSystemAlert(classifyValidationFailure(validation.reason), validation.reason);
    return writeLog(attachment, config, createdAt, "rejected", validation.reason);
  }

  const initial = writeLog(attachment, config, createdAt, "received");

  return initial;
}

export async function printRegisteredAttachment(
  attachment: PrintLogEntry,
  getConfig: () => AppConfig
): Promise<PrintLogEntry> {
  const config = getConfig();
  try {
    const startedAt = Date.now();
    await printFile(attachment, config);
    const durationMs = Date.now() - startedAt;
    const printedPath = moveTo(attachment.filePath, appPaths.printedDir);
    setPrintStatus(attachment.id, "printed", undefined, config.printerName);
    savePrintDuration(attachment.id, durationMs);
    if (config.deleteAfterPrint) {
      await wait(2000);
      deletePrintedArtifacts(attachment.filePath, printedPath, attachment.id);
    }
    return { ...attachment, status: "printed", filePath: printedPath, printerName: config.printerName };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    const failedPath = moveTo(attachment.filePath, appPaths.failedDir);
    setPrintStatus(attachment.id, "failed", reason, config.printerName);
    sendSystemAlert("ההדפסה נכשלה", reason);
    logger.error({ error, attachment }, "Print failed");
    return { ...attachment, status: "failed", failureReason: reason, filePath: failedPath };
  }
}

function writeLog(
  attachment: IncomingAttachment,
  config: AppConfig,
  createdAt: string,
  status: PrintLogEntry["status"],
  failureReason?: string
): PrintLogEntry {
  const entry: PrintLogEntry = {
    ...attachment,
    createdAt,
    printerName: config.printerName,
    status,
    failureReason
  };
  savePrintLog(entry);
  logger.info({ entry }, "Print job updated");
  return entry;
}

function moveTo(sourcePath: string, destinationDir: string): string {
  fs.mkdirSync(destinationDir, { recursive: true });
  if (!fs.existsSync(sourcePath)) {
    return sourcePath;
  }

  const destinationPath = path.join(destinationDir, path.basename(sourcePath));
  fs.renameSync(sourcePath, destinationPath);
  return destinationPath;
}

function deletePrintedArtifacts(downloadPath: string, printedPath: string, jobId: string): void {
  for (const targetPath of new Set([downloadPath, printedPath])) {
    if (!targetPath || !fs.existsSync(targetPath)) {
      continue;
    }

    try {
      fs.unlinkSync(targetPath);
    } catch (error) {
      sendSystemAlert(
        "מחיקת קובץ לאחר הדפסה נכשלה",
        error instanceof Error ? error.message : String(error)
      );
      logger.error({ err: error, jobId, targetPath }, "Failed to delete printed file");
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyValidationFailure(reason: string): string {
  if (reason.includes("larger")) return "קובץ גדול מהמותר";
  if (reason.includes("not allowed")) return "סוג קובץ לא נתמך";
  if (reason.includes("content looks")) return "קובץ פגום";
  return "קובץ נדחה";
}
