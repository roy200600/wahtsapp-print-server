import os from "node:os";
import { loadConfig } from "./config.js";
import { logger } from "./logger.js";

type AlertSender = (phone: string, text: string) => Promise<void>;

let sender: AlertSender | undefined;

export function registerAlertSender(nextSender: AlertSender): void {
  sender = nextSender;
}

export function sendSystemAlert(type: string, description: string): void {
  void sendAlert(type, description);
}

export async function sendTestAlert(): Promise<void> {
  await sendAlert(
    "בדיקת מערכת",
    "✅ בדיקת מערכת\n\nשרת ההדפסה פועל תקין.\n\nזוהי הודעת בדיקה.",
    true
  );
}

async function sendAlert(type: string, description: string, rawMessage = false): Promise<void> {
  try {
    const config = loadConfig();
    if (!config.alertsEnabled || !config.alertsPhone || !sender) {
      return;
    }

    const text = rawMessage ? description : formatAlert(type, description);
    await sender(config.alertsPhone, text);
  } catch (error) {
    logger.error({ err: error, type }, "Failed to send WhatsApp system alert");
  }
}

function formatAlert(type: string, description: string): string {
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
    "",
    "זמן:",
    new Date().toLocaleString("he-IL"),
    "",
    "מחשב:",
    os.hostname()
  ].join("\n");
}
