import { DatabaseSync } from "node:sqlite";
import { databasePath } from "./paths.js";
import { ensureDirectories } from "./config.js";
import { getPrintDuration } from "./printMetrics.js";
import type { PrintLogEntry, PrintStatus } from "./types.js";

ensureDirectories();

export const db = new DatabaseSync(databasePath);

db.exec(`
CREATE TABLE IF NOT EXISTS print_jobs (
  id TEXT PRIMARY KEY,
  message_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  sender_name TEXT,
  sender_phone TEXT,
  group_name TEXT,
  chat_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  printer_name TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT
);
`);

const insertJob = db.prepare(`
INSERT OR REPLACE INTO print_jobs (
  id, message_key, created_at, sender_name, sender_phone, group_name, chat_id,
  file_name, file_type, mime_type, size_bytes, file_path, printer_name, status, failure_reason
) VALUES (
  :id, :messageKey, :createdAt, :senderName, :senderPhone, :groupName, :chatId,
  :fileName, :extension, :mimeType, :sizeBytes, :filePath, :printerName, :status, :failureReason
)
`);

const updateStatus = db.prepare(`
UPDATE print_jobs
SET status = ?, failure_reason = ?, printer_name = ?
WHERE id = ?
`);

export function hasMessage(messageKey: string): boolean {
  const row = db.prepare("SELECT id FROM print_jobs WHERE message_key = ?").get(messageKey);
  return Boolean(row);
}

export function savePrintLog(entry: PrintLogEntry): void {
  insertJob.run({
    id: entry.id,
    messageKey: entry.messageKey,
    createdAt: entry.createdAt,
    senderName: entry.senderName,
    senderPhone: entry.senderPhone,
    groupName: entry.groupName ?? null,
    chatId: entry.chatId,
    fileName: entry.fileName,
    extension: entry.extension,
    mimeType: entry.mimeType,
    sizeBytes: entry.sizeBytes,
    filePath: entry.filePath,
    printerName: entry.printerName,
    status: entry.status,
    failureReason: entry.failureReason ?? null
  });
}

export function setPrintStatus(
  id: string,
  status: PrintStatus,
  failureReason: string | undefined,
  printerName: string
): void {
  updateStatus.run(status, failureReason ?? null, printerName, id);
}

export function listRecentJobs(limit = 100): unknown[] {
  return db
    .prepare("SELECT * FROM print_jobs ORDER BY created_at DESC LIMIT ?")
    .all(limit)
    .map((job) => {
      const row = job as Record<string, unknown>;
      return {
        ...row,
        duration_ms: typeof row.id === "string" ? (getPrintDuration(row.id) ?? null) : null
      };
    });
}
