import fs from "node:fs";
import path from "node:path";
import { databasePath } from "./paths.js";
import { ensureDirectories } from "./config.js";
import { getPrintDuration } from "./printMetrics.js";
import type { PrintLogEntry, PrintStatus } from "./types.js";

type StoredPrintJob = {
  id: string;
  message_key: string;
  created_at: string;
  sender_name?: string;
  sender_phone?: string;
  group_name?: string | null;
  chat_id: string;
  file_name: string;
  file_type: string;
  mime_type: string;
  size_bytes: number;
  file_path: string;
  printer_name?: string;
  status: PrintStatus;
  failure_reason?: string | null;
};

export interface InterruptedJobRecoveryResult {
  recovered: number;
  movedFiles: number;
  errors: string[];
  jobs: Array<{
    id: string;
    fileName: string;
    previousStatus: PrintStatus;
  }>;
}

ensureDirectories();

export function hasMessage(messageKey: string): boolean {
  return readJobs().some((job) => job.message_key === messageKey);
}

export function savePrintLog(entry: PrintLogEntry): void {
  const jobs = readJobs();
  const job: StoredPrintJob = {
    id: entry.id,
    message_key: entry.messageKey,
    created_at: entry.createdAt,
    sender_name: entry.senderName,
    sender_phone: entry.senderPhone,
    group_name: entry.groupName ?? null,
    chat_id: entry.chatId,
    file_name: entry.fileName,
    file_type: entry.extension,
    mime_type: entry.mimeType,
    size_bytes: entry.sizeBytes,
    file_path: entry.filePath,
    printer_name: entry.printerName,
    status: entry.status,
    failure_reason: entry.failureReason ?? null
  };

  const index = jobs.findIndex((existing) => existing.id === job.id || existing.message_key === job.message_key);
  if (index >= 0) {
    jobs[index] = job;
  } else {
    jobs.push(job);
  }

  writeJobs(jobs);
}

export function setPrintStatus(
  id: string,
  status: PrintStatus,
  failureReason: string | undefined,
  printerName: string
): void {
  const jobs = readJobs();
  const job = jobs.find((existing) => existing.id === id);
  if (!job) {
    return;
  }

  job.status = status;
  job.failure_reason = failureReason ?? null;
  job.printer_name = printerName;
  writeJobs(jobs);
}

export function listRecentJobs(limit = 100): unknown[] {
  return readJobs()
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, limit)
    .map((job) => ({
      ...job,
      duration_ms: getPrintDuration(job.id) ?? null
    }));
}

export function recoverInterruptedJobs(failedDir: string, printerName = ""): InterruptedJobRecoveryResult {
  const jobs = readJobs();
  const result: InterruptedJobRecoveryResult = {
    recovered: 0,
    movedFiles: 0,
    errors: [],
    jobs: []
  };

  for (const job of jobs) {
    if (!["received", "printing"].includes(job.status)) {
      continue;
    }

    const previousStatus = job.status;
    job.status = "failed";
    job.failure_reason =
      previousStatus === "printing"
        ? "System restarted while this job was printing. The job was canceled during startup recovery."
        : "System restarted while this job was waiting for customer approval or print completion. The orphaned job was canceled during startup recovery.";
    job.printer_name = job.printer_name || printerName;
    result.recovered++;
    result.jobs.push({
      id: job.id,
      fileName: job.file_name,
      previousStatus
    });

    if (!job.file_path || !fs.existsSync(job.file_path)) {
      continue;
    }

    try {
      fs.mkdirSync(failedDir, { recursive: true });
      const nextPath = uniqueDestinationPath(failedDir, path.basename(job.file_path));
      fs.renameSync(job.file_path, nextPath);
      job.file_path = nextPath;
      result.movedFiles++;
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (result.recovered > 0 || result.errors.length > 0) {
    writeJobs(jobs);
  }

  return result;
}

function readJobs(): StoredPrintJob[] {
  ensureDirectories();
  if (!fs.existsSync(databasePath)) {
    return [];
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(databasePath, "utf8").replace(/^\uFEFF/, ""));
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

function writeJobs(jobs: StoredPrintJob[]): void {
  ensureDirectories();
  fs.writeFileSync(databasePath, JSON.stringify({ jobs }, null, 2), "utf8");
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
