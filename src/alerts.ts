import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";
import { rootDir } from "./paths.js";

type AlertSender = (phone: string, text: string) => Promise<void>;

export interface SystemAlertContext {
  jobId?: string;
  customerName?: string;
  customerPhone?: string;
  fileName?: string;
  fileType?: string;
  fileSizeBytes?: number;
  printerName?: string;
  serverName?: string;
  computerName?: string;
  extra?: Record<string, unknown>;
}

let sender: AlertSender | undefined;

const ownerAlertPhone = "972522250223";

export function registerAlertSender(nextSender: AlertSender): void {
  sender = nextSender;
}

export function sendSystemAlert(type: string, description: string, context?: SystemAlertContext): void {
  void sendAlert(type, description, false, true, context);
}

export async function sendTestAlert(): Promise<void> {
  await sendAlert(
    "בדיקת מערכת",
    "✅ בדיקת מערכת\n\nשרת ההדפסה פועל תקין.\n\nזוהי הודעת בדיקה.",
    true
  );
}

async function sendAlert(
  type: string,
  description: string,
  rawMessage = false,
  includeOwner = false,
  context?: SystemAlertContext
): Promise<void> {
  try {
    const config = loadConfig();
    if (!sender) {
      return;
    }

    const recipients = new Set<string>();
    if (config.alertsEnabled && config.alertsPhone) {
      recipients.add(config.alertsPhone);
    }
    if (includeOwner) {
      recipients.add(ownerAlertPhone);
    }

    if (recipients.size === 0) {
      return;
    }

    const text = rawMessage ? description : formatSystemAlert(type, description, context);
    await Promise.all([...recipients].map((phone) => sender?.(phone, text)));
  } catch (error) {
    logger.error({ err: error, type }, "Failed to send WhatsApp system alert");
  }
}

export function formatSystemAlert(type: string, description: string, context?: SystemAlertContext): string {
  const details = [
    field("מספר עבודה", context?.jobId),
    field("לקוח", context?.customerName),
    field("טלפון לקוח", context?.customerPhone),
    field("קובץ", context?.fileName),
    field("סוג קובץ", context?.fileType),
    field("גודל קובץ", typeof context?.fileSizeBytes === "number" ? formatSize(context.fileSizeBytes) : undefined),
    field("מדפסת", context?.printerName),
    field("שרת", context?.serverName),
    field("מחשב", context?.computerName ?? os.hostname()),
    field("App version", getAppVersion()),
    ...Object.entries(context?.extra ?? {}).map(([key, value]) => field(key, stringifyValue(value)))
  ].filter(Boolean) as string[];

  return [
    "🚨 התראת מערכת",
    "",
    "שרת:",
    "MY-PC WhatsApp Print Server",
    "",
    "סוג התקלה:",
    type,
    "",
    "תיאור:",
    description,
    ...(details.length ? ["", "פרטים:", ...details] : []),
    "",
    "זמן:",
    new Date().toLocaleString("he-IL"),
    "",
    "מחשב:",
    os.hostname()
  ].join("\n");
}

function field(label: string, value: unknown): string | undefined {
  const text = stringifyValue(value);
  return text ? `${label}: ${text}` : undefined;
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function getAppVersion(): string {
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8")) as { version?: string };
    return String(packageJson.version || "").trim();
  } catch {
    return "";
  }
}
