import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AppConfig, IncomingAttachment, PrintLogEntry } from "./types.js";
import { validateAttachment } from "./security.js";
import { printFile } from "./printer.js";
import { appPaths } from "./paths.js";
import { hasMessage, hasSenderMessage, savePrintLog, setPrintStatus } from "./db.js";
import { logger } from "./logger.js";
import { savePrintDuration } from "./printMetrics.js";
import { sendSystemAlert } from "./alerts.js";
import { applyLicenseLimits, getLicenseStatus, registerTrialDocument } from "./license.js";
import { describeError, errorDetailsForAlert } from "./errorDetails.js";

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
  const config = applyLicenseLimits(getConfig());
  const createdAt = new Date().toISOString();

  if (hasMessage(attachment.messageKey) || hasSenderMessage(attachment.senderPhone, messageIdFromKey(attachment.messageKey))) {
    return writeLog(attachment, config, createdAt, "rejected", "Duplicate message");
  }

  const validation = await validateAttachment(attachment, config);
  if (!validation.ok) {
    const failureReason = normalizeValidationReason(validation.reason);
    await moveTo(attachment.filePath, appPaths.failedDir);
    sendSystemAlert(classifyValidationFailure(failureReason), failureReason, attachmentAlertContext(attachment, config));
    return writeLog(attachment, config, createdAt, "rejected", failureReason);
  }

  const trialCheck = registerTrialDocument(attachment.senderPhone);
  if (!trialCheck.ok) {
    await moveTo(attachment.filePath, appPaths.failedDir);
    sendSystemAlert("Trial limit reached", trialCheck.reason, attachmentAlertContext(attachment, config));
    return writeLog(attachment, config, createdAt, "rejected", trialCheck.reason);
  }

  return writeLog(attachment, config, createdAt, "received");
}

export async function printRegisteredAttachment(
  attachment: PrintLogEntry,
  getConfig: () => AppConfig
): Promise<PrintLogEntry> {
  const config = applyLicenseLimits(getConfig());
  try {
    const startedAt = Date.now();
    setPrintStatus(attachment.id, "printing", undefined, config.printerName);
    await printFile(attachment, config);
    const durationMs = Date.now() - startedAt;
    const printedPath = await moveTo(attachment.filePath, appPaths.printedDir);
    setPrintStatus(attachment.id, "printed", undefined, config.printerName);
    savePrintDuration(attachment.id, durationMs);
    if (config.deleteAfterPrint) {
      await wait(2000);
      deletePrintedArtifacts(attachment.filePath, printedPath, attachment.id);
    }
    return { ...attachment, status: "printed", filePath: printedPath, printerName: config.printerName };
  } catch (error) {
    const reason = describeError(error);
    const failedPath = await moveTo(attachment.filePath, appPaths.failedDir);
    setPrintStatus(attachment.id, "failed", reason, config.printerName);
    sendSystemAlert("ההדפסה נכשלה", reason, attachmentAlertContext(attachment, config));
    logger.error({ err: error, errorDetails: errorDetailsForAlert(error), attachment }, "Print failed");
    return { ...attachment, status: "failed", failureReason: reason, filePath: failedPath };
  }
}

export async function completeExternalPrintAttachment(
  attachment: PrintLogEntry,
  getConfig: () => AppConfig,
  durationMs: number,
  printerName?: string
): Promise<PrintLogEntry> {
  const config = applyLicenseLimits(getConfig());
  const targetPrinterName = printerName || config.printerName;
  const printedPath = await moveTo(attachment.filePath, appPaths.printedDir);
  setPrintStatus(attachment.id, "printed", undefined, targetPrinterName);
  savePrintDuration(attachment.id, durationMs);
  if (config.deleteAfterPrint) {
    await wait(2000);
    deletePrintedArtifacts(attachment.filePath, printedPath, attachment.id);
  }
  return { ...attachment, status: "printed", filePath: printedPath, printerName: targetPrinterName };
}

export function failRegisteredAttachment(
  attachment: PrintLogEntry,
  getConfig: () => AppConfig,
  reason: string
): PrintLogEntry {
  const config = applyLicenseLimits(getConfig());
  const failedPath = moveToBestEffortSync(attachment.filePath, appPaths.failedDir);
  setPrintStatus(attachment.id, "failed", reason, config.printerName);
  return { ...attachment, status: "failed", failureReason: reason, filePath: failedPath, printerName: config.printerName };
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

async function moveTo(sourcePath: string, destinationDir: string): Promise<string> {
  fs.mkdirSync(destinationDir, { recursive: true });
  if (!fs.existsSync(sourcePath)) {
    return sourcePath;
  }

  const destinationPath = uniqueDestinationPath(destinationDir, path.basename(sourcePath));
  const errors: string[] = [];

  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      fs.renameSync(sourcePath, destinationPath);
      return destinationPath;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      if (!isRetryableFileError(error) || attempt === 6) {
        break;
      }
      await wait(250 * attempt);
    }
  }

  try {
    fs.copyFileSync(sourcePath, destinationPath);
    try {
      fs.unlinkSync(sourcePath);
    } catch (unlinkError) {
      logger.warn({ err: unlinkError, sourcePath, destinationPath }, "Moved file by copy but source is still locked");
    }
    return destinationPath;
  } catch (copyError) {
    logger.error({ err: copyError, sourcePath, destinationPath, errors }, "Failed to move print file");
    sendSystemAlert("File move failed", copyError instanceof Error ? copyError.message : String(copyError), {
      computerName: os.hostname(),
      extra: { sourcePath, destinationPath, errors }
    });
    return sourcePath;
  }
}

function moveToBestEffortSync(sourcePath: string, destinationDir: string): string {
  fs.mkdirSync(destinationDir, { recursive: true });
  if (!fs.existsSync(sourcePath)) {
    return sourcePath;
  }

  const destinationPath = uniqueDestinationPath(destinationDir, path.basename(sourcePath));
  try {
    fs.renameSync(sourcePath, destinationPath);
    return destinationPath;
  } catch (error) {
    logger.warn({ err: error, sourcePath, destinationPath }, "Failed to rename print file synchronously");
  }

  try {
    fs.copyFileSync(sourcePath, destinationPath);
    try {
      fs.unlinkSync(sourcePath);
    } catch (unlinkError) {
      logger.warn({ err: unlinkError, sourcePath, destinationPath }, "Copied failed file but source is still locked");
    }
    return destinationPath;
  } catch (copyError) {
    logger.error({ err: copyError, sourcePath, destinationPath }, "Failed to move print file synchronously");
    sendSystemAlert("File move failed", copyError instanceof Error ? copyError.message : String(copyError), {
      computerName: os.hostname(),
      extra: { sourcePath, destinationPath }
    });
  }

  return sourcePath;
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
        error instanceof Error ? error.message : String(error),
        { jobId, computerName: os.hostname(), extra: { targetPath } }
      );
      logger.error({ err: error, jobId, targetPath }, "Failed to delete printed file");
    }
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueDestinationPath(destinationDir: string, fileName: string): string {
  const parsed = path.parse(fileName);
  let candidate = path.join(destinationDir, fileName);
  let counter = 1;

  while (fs.existsSync(candidate)) {
    candidate = path.join(destinationDir, `${parsed.name}-${counter}${parsed.ext}`);
    counter++;
  }

  return candidate;
}

function isRetryableFileError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EBUSY" || code === "EPERM" || code === "EACCES" || code === "ENOTEMPTY";
}

function classifyValidationFailure(reason: string): string {
  if (reason.includes("larger")) return "קובץ גדול מהמותר";
  if (reason.includes("not allowed")) return "סוג קובץ לא נתמך";
  if (reason.includes("content looks")) return "קובץ פגום";
  return "קובץ נדחה";
}

function normalizeValidationReason(reason: string): string {
  const status = getLicenseStatus();
  if (status.mode === "trial" && reason.includes("not allowed")) {
    return `${reason}. Trial mode allows PDF/JPG/JPEG/PNG only. A valid license is required for Office, TXT, CSV, Excel, and PowerPoint files.`;
  }

  if (status.mode !== "licensed" && reason.includes("not allowed")) {
    return `${reason}. A valid license is required before printing Office, TXT, CSV, Excel, and PowerPoint files.`;
  }

  return reason;
}

function messageIdFromKey(messageKey: string): string {
  return String(messageKey || "").split(":").pop() ?? "";
}

function attachmentAlertContext(attachment: IncomingAttachment, config: AppConfig) {
  return {
    jobId: attachment.id,
    customerName: attachment.senderName,
    customerPhone: attachment.senderPhone,
    fileName: attachment.fileName,
    fileType: attachment.extension,
    fileSizeBytes: attachment.sizeBytes,
    printerName: config.printerName,
    computerName: os.hostname()
  };
}
