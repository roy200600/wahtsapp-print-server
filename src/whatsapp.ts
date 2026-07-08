import fs from "node:fs";
import path from "node:path";
import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type AnyMessageContent,
  type proto,
  type WASocket
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import { Boom } from "@hapi/boom";
import { appPaths } from "./paths.js";
import { normalizePhone } from "./config.js";
import type { AppConfig, IncomingAttachment, PrintLogEntry } from "./types.js";
import { processAttachment } from "./jobProcessor.js";
import { logger } from "./logger.js";
import { registerAlertSender, sendSystemAlert } from "./alerts.js";
import { PrintOrderManager } from "./printOrders.js";
import { assertLicenseCanRun, getLicenseStatus } from "./license.js";
import { checkForUpdates, runUpdate } from "./maintenance.js";
import { APP_VERSION } from "./version.js";
import { captureScreen, formatRemoteSupportCaption, startRemoteSupportSession } from "./remoteSupport.js";

type StatusListener = (state: WhatsAppRuntimeState) => void;

export interface WhatsAppRuntimeState {
  connected: boolean;
  qrDataUrl?: string;
  lastError?: string;
}

export class WhatsAppService {
  private socket?: WASocket;
  private state: WhatsAppRuntimeState = { connected: false };
  private listeners = new Set<StatusListener>();
  private intentionalStop = false;
  private reconnectTimer?: NodeJS.Timeout;
  private readonly printOrders: PrintOrderManager;

  constructor(private readonly getConfig: () => AppConfig) {
    this.printOrders = new PrintOrderManager(getConfig, async (remoteJid, text) => {
      await this.sendText(remoteJid, text);
    });
  }

  getState(): WhatsAppRuntimeState {
    return this.state;
  }

  onStatus(listener: StatusListener): void {
    this.listeners.add(listener);
  }

  async start(): Promise<void> {
    assertLicenseCanRun();
    if (this.socket) {
      return;
    }

    this.intentionalStop = false;
    const { state, saveCreds } = await useMultiFileAuthState(appPaths.authDir);
    const { version } = await fetchLatestBaileysVersion();
    this.socket = makeWASocket({
      auth: state,
      version,
      printQRInTerminal: false
    });

    registerAlertSender(async (phone, text) => {
      await this.sendTextToPhone(phone, text);
    });

    this.socket.ev.on("creds.update", saveCreds);
    this.socket.ev.on("connection.update", async (update) => {
      if (update.qr) {
        this.setState({ connected: false, qrDataUrl: await QRCode.toDataURL(update.qr) });
        sendSystemAlert("QR חדש נדרש", "נדרש לסרוק QR חדש כדי לחבר את WhatsApp.");
      }

      if (update.connection === "open") {
        this.setState({ connected: true, qrDataUrl: undefined, lastError: undefined });
      }

      if (update.connection === "close") {
        const reason = (update.lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        const shouldReconnect = !this.intentionalStop && reason !== DisconnectReason.loggedOut && getLicenseStatus().canRun;
        this.socket = undefined;
        this.setState({
          connected: false,
          qrDataUrl: undefined,
          lastError: update.lastDisconnect?.error?.message
        });
        sendSystemAlert(
          shouldReconnect ? "WhatsApp התנתק" : "כשל בחיבור ל־WhatsApp",
          update.lastDisconnect?.error?.message ?? "חיבור WhatsApp נסגר."
        );
        if (shouldReconnect) {
          this.reconnectTimer = setTimeout(() => void this.start(), 5000);
        }
      }
    });

    this.socket.ev.on("messages.upsert", async ({ messages }) => {
      for (const message of messages) {
        await this.handleMessage(message);
      }
    });
  }

  async stop(clearAuth = true): Promise<void> {
    this.intentionalStop = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    const socket = this.socket;
    this.socket = undefined;
    try {
      await socket?.logout();
    } catch {
      socket?.end(undefined);
    }

    if (clearAuth) {
      fs.rmSync(appPaths.authDir, { recursive: true, force: true });
      fs.mkdirSync(appPaths.authDir, { recursive: true });
    }

    this.setState({ connected: false, qrDataUrl: undefined, lastError: undefined });
  }

  async reset(): Promise<void> {
    await this.stop(true);
    await this.start();
  }

  private async handleMessage(message: proto.IWebMessageInfo): Promise<void> {
    if (!this.socket || !message.message || message.key.fromMe) {
      return;
    }

    const text = safeContentText(message.message);
    const remoteJid = message.key.remoteJid ?? "";
    const senderPhone = this.senderPhone(message);

    if (text && isOwnerCloudUpdateCommand(senderPhone, text)) {
      await this.handleOwnerCloudUpdateCommand(remoteJid, senderPhone);
      return;
    }

    if (text && isOwnerVersionCommand(senderPhone, text)) {
      await this.handleOwnerVersionCommand(remoteJid, senderPhone);
      return;
    }

    if (text && isOwnerStatusCommand(senderPhone, text)) {
      await this.handleOwnerStatusCommand(remoteJid, senderPhone);
      return;
    }

    if (text && isOwnerCommandMapCommand(senderPhone, text)) {
      await this.handleOwnerCommandMapCommand(remoteJid, senderPhone);
      return;
    }

    if (text && isOwnerFullDiagnosticsCommand(senderPhone, text)) {
      await this.handleOwnerFullDiagnosticsCommand(remoteJid, senderPhone);
      return;
    }

    if (text && isOwnerScreenshotCommand(senderPhone, text)) {
      await this.handleOwnerScreenshotCommand(remoteJid, senderPhone);
      return;
    }

    if (text && isOwnerRemoteSupportCommand(senderPhone, text)) {
      await this.handleOwnerRemoteSupportCommand(remoteJid, senderPhone);
      return;
    }

    if (text && isOwnerLogExportCommand(senderPhone, text)) {
      await this.handleOwnerLogExportCommand(remoteJid, senderPhone);
      return;
    }

    if (!getLicenseStatus().canRun) {
      await this.stop(false);
      return;
    }

    const content = unwrapMessage(message.message);
    const document = content.documentMessage;
    const image = content.imageMessage;
    const mediaMessage = document ?? image;
    if (!mediaMessage) {
      if (text) {
        await this.printOrders.receiveText(senderPhone, remoteJid, text);
      }
      return;
    }

    try {
      const buffer = await downloadMediaMessage(message, "buffer", {});
      const attachment = await this.buildAttachment(message, mediaMessage, Buffer.from(buffer));
      await this.printOrders.receiveAttachment(attachment);
    } catch (error) {
      logger.error({ err: error, messageKey: message.key.id }, "Failed to handle WhatsApp message");
    }
  }

  private async buildAttachment(
    message: proto.IWebMessageInfo,
    mediaMessage: proto.Message.IDocumentMessage | proto.Message.IImageMessage,
    buffer: Buffer
  ): Promise<IncomingAttachment> {
    const remoteJid = message.key.remoteJid ?? "";
    const senderPhone = this.senderPhone(message);
    const senderName = message.pushName ?? senderPhone;
    const groupName = remoteJid.endsWith("@g.us") ? await this.getGroupName(remoteJid) : undefined;
    const mimeType = mediaMessage.mimetype ?? "application/octet-stream";
    const rawFileName =
      "fileName" in mediaMessage && mediaMessage.fileName
        ? mediaMessage.fileName
        : `whatsapp-${Date.now()}.${mimeToExtension(mimeType)}`;
    const extension = path.extname(rawFileName).replace(".", "") || mimeToExtension(mimeType);
    const safeFileName = rawFileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_");
    const id = uuidv4();
    const filePath = path.join(appPaths.downloadsDir, `${id}-${safeFileName}`);
    fs.writeFileSync(filePath, buffer);

    return {
      id,
      chatId: remoteJid,
      senderName,
      senderPhone,
      groupName,
      fileName: safeFileName,
      mimeType,
      extension: extension.toLowerCase(),
      sizeBytes: buffer.length,
      filePath,
      messageText: safeContentText(message.message),
      messageKey: `${remoteJid}:${message.key.id ?? id}`
    };
  }

  private async getGroupName(groupJid: string): Promise<string | undefined> {
    try {
      const metadata = await this.socket?.groupMetadata(groupJid);
      return metadata?.subject;
    } catch {
      return undefined;
    }
  }

  private async handleOwnerCloudUpdateCommand(remoteJid: string, senderPhone: string): Promise<void> {
    const targetJid = remoteJid || (await this.resolvePhoneJid(senderPhone));
    try {
      await this.sendText(targetJid, "עדכון ענן התקבל. המערכת מתחילה לעדכן ברקע ותיטען מחדש בעוד כדקה.");
      const result = await runUpdate();
      logger.warn({ senderPhone, result }, "Owner cloud update command accepted");
      sendSystemAlert("עדכון ענן הופעל", `פקודת עדכון הופעלה מרחוק על ידי ${senderPhone}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, senderPhone }, "Owner cloud update command failed");
      await this.sendText(targetJid, `עדכון ענן נכשל: ${message}`).catch(() => {});
    }
  }

  private async handleOwnerVersionCommand(remoteJid: string, senderPhone: string): Promise<void> {
    const targetJid = remoteJid || (await this.resolvePhoneJid(senderPhone));
    try {
      const license = getLicenseStatus();
      const update = await checkForUpdates();
      await this.sendText(targetJid, [
        "📦 גרסת שרת",
        "",
        `גרסה מותקנת: ${APP_VERSION}`,
        `גרסה זמינה ב-GitHub: ${update.latest}`,
        `עדכון זמין: ${update.available ? "כן" : "לא"}`,
        `רישוי: ${license.mode}`,
        `פעיל: ${license.canRun ? "כן" : "לא"}`,
        `קוד מחשב: ${license.machineCode}`
      ].join("\n"));
      logger.warn({ senderPhone }, "Owner version command accepted");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, senderPhone }, "Owner version command failed");
      await this.sendText(targetJid, `בדיקת גרסה נכשלה: ${message}`).catch(() => {});
    }
  }

  private async handleOwnerStatusCommand(remoteJid: string, senderPhone: string): Promise<void> {
    const targetJid = remoteJid || (await this.resolvePhoneJid(senderPhone));
    try {
      const license = getLicenseStatus();
      await this.sendText(targetJid, [
        "🖥 סטטוס שרת",
        "",
        `גרסה: ${APP_VERSION}`,
        `WhatsApp: ${this.state.connected ? "מחובר" : "מנותק"}`,
        `שגיאה אחרונה: ${this.state.lastError || "אין"}`,
        `רישוי: ${license.mode}`,
        `אפשר להפעיל: ${license.canRun ? "כן" : "לא"}`,
        `תוקף: ${license.expiresAt || "ללא"}`,
        `ימי ניסיון שנותרו: ${license.trialDaysLeft}`,
        `קוד מחשב: ${license.machineCode}`
      ].join("\n"));
      logger.warn({ senderPhone }, "Owner status command accepted");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, senderPhone }, "Owner status command failed");
      await this.sendText(targetJid, `בדיקת סטטוס נכשלה: ${message}`).catch(() => {});
    }
  }

  private async handleOwnerCommandMapCommand(remoteJid: string, senderPhone: string): Promise<void> {
    const targetJid = remoteJid || (await this.resolvePhoneJid(senderPhone));
    await this.sendText(targetJid, ownerCommandMapText());
    logger.warn({ senderPhone }, "Owner command map sent");
  }

  private async handleOwnerFullDiagnosticsCommand(remoteJid: string, senderPhone: string): Promise<void> {
    await this.handleOwnerStatusCommand(remoteJid, senderPhone);
    await this.handleOwnerVersionCommand(remoteJid, senderPhone);
    await this.handleOwnerLogExportCommand(remoteJid, senderPhone);
    logger.warn({ senderPhone }, "Owner full diagnostics command accepted");
  }

  private async handleOwnerScreenshotCommand(remoteJid: string, senderPhone: string): Promise<void> {
    const targetJid = remoteJid || (await this.resolvePhoneJid(senderPhone));
    try {
      if (!this.socket) {
        throw new Error("WhatsApp is not connected");
      }

      await this.sendText(targetJid, "צילום מסך התקבל. יוצר צילום ושולח אליך...");
      const screenshotPath = await captureScreen();
      await this.socket.sendMessage(targetJid, {
        image: fs.readFileSync(screenshotPath),
        caption: `📸 צילום מסך מהשרת\nגרסה: ${APP_VERSION}\nזמן: ${new Date().toLocaleString("he-IL")}`
      });
      logger.warn({ senderPhone, screenshotPath }, "Owner screenshot command accepted");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, senderPhone }, "Owner screenshot command failed");
      await this.sendText(targetJid, `צילום מסך נכשל: ${message}`).catch(() => {});
    }
  }

  private async handleOwnerRemoteSupportCommand(remoteJid: string, senderPhone: string): Promise<void> {
    const targetJid = remoteJid || (await this.resolvePhoneJid(senderPhone));
    try {
      if (!this.socket) {
        throw new Error("WhatsApp is not connected");
      }

      await this.sendText(targetJid, "פקודת תמיכה מרחוק התקבלה. סוגר TeamViewer פעיל, פותח QS ושולח צילום מסך...");
      const result = await startRemoteSupportSession();
      await this.socket.sendMessage(targetJid, {
        image: fs.readFileSync(result.screenshotPath),
        caption: formatRemoteSupportCaption()
      });
      logger.warn({ senderPhone, teamViewerPath: result.teamViewerPath, screenshotPath: result.screenshotPath }, "Owner remote support command accepted");
      sendSystemAlert("תמיכה מרחוק הופעלה", `TeamViewer QS הופעל מרחוק על ידי ${senderPhone}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, senderPhone }, "Owner remote support command failed");
      await this.sendText(targetJid, `פתיחת תמיכה מרחוק נכשלה: ${message}`).catch(() => {});
    }
  }

  private async handleOwnerLogExportCommand(remoteJid: string, senderPhone: string): Promise<void> {
    const targetJid = remoteJid || (await this.resolvePhoneJid(senderPhone));
    try {
      if (!this.socket) {
        throw new Error("WhatsApp is not connected");
      }

      const files = fs
        .readdirSync(appPaths.logsDir, { withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => {
          const filePath = path.join(appPaths.logsDir, entry.name);
          const stat = fs.statSync(filePath);
          return { name: entry.name, filePath, modifiedAt: stat.mtimeMs, size: stat.size };
        })
        .sort((a, b) => b.modifiedAt - a.modifiedAt);

      if (files.length === 0) {
        await this.sendText(targetJid, "לא נמצאו קבצי לוג לשליחה.");
        return;
      }

      await this.sendText(targetJid, `פקודת לוגים 223 התקבלה.\nנמצאו ${files.length} קבצי לוג. שולח עכשיו...`);

      for (const file of files) {
        await this.socket.sendMessage(targetJid, {
          document: fs.readFileSync(file.filePath),
          fileName: file.name,
          mimetype: logMimeType(file.name)
        });
      }

      logger.warn({ senderPhone, files: files.map((file) => ({ name: file.name, size: file.size })) }, "Owner log export command accepted");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ err: error, senderPhone }, "Owner log export command failed");
      await this.sendText(targetJid, `שליחת קבצי לוג נכשלה: ${message}`).catch(() => {});
    }
  }

  private async reply(message: proto.IWebMessageInfo, result: PrintLogEntry): Promise<void> {
    if (!this.socket || !message.key.remoteJid) {
      return;
    }

    if (result.status !== "printed") {
      return;
    }

    const replyContent: AnyMessageContent = { text: customerPrintSuccessMessage() };
    await this.socket.sendMessage(message.key.remoteJid, replyContent, { quoted: message });
    this.scheduleCustomerFollowUp(message.key.remoteJid);
  }

  private scheduleCustomerFollowUp(remoteJid: string): void {
    setTimeout(() => {
      void this.socket?.sendMessage(remoteJid, { text: customerFollowUpMessage() }).catch((error) => {
        logger.error({ err: error, remoteJid }, "Failed to send delayed customer follow-up");
      });
    }, 10 * 60 * 1000);
  }

  private setState(next: WhatsAppRuntimeState): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener(next);
    }
  }

  private senderPhone(message: proto.IWebMessageInfo): string {
    const key = message.key as proto.IMessageKey & { senderPn?: string; participantPn?: string };
    const senderJid = key.senderPn ?? key.participantPn ?? message.key.participant ?? message.key.remoteJid ?? "";
    return normalizePhone(senderJid.split("@")[0] ?? "");
  }

  private async sendText(remoteJid: string, text: string): Promise<void> {
    if (!this.socket) {
      throw new Error("WhatsApp is not connected");
    }

    await this.socket.sendMessage(await this.resolveOutboundJid(remoteJid), { text });
  }

  private async sendTextToPhone(phone: string, text: string): Promise<void> {
    if (!this.socket) {
      throw new Error("WhatsApp is not connected");
    }

    await this.socket.sendMessage(await this.resolvePhoneJid(phone), { text });
  }

  private async resolveOutboundJid(remoteJid: string): Promise<string> {
    const phoneMatch = remoteJid.match(/^(\d+)@s\.whatsapp\.net$/);
    if (!phoneMatch) {
      return remoteJid;
    }

    return this.resolvePhoneJid(phoneMatch[1]);
  }

  private async resolvePhoneJid(phone: string): Promise<string> {
    const normalized = normalizePhone(phone);
    if (!this.socket || !normalized) {
      return `${normalized}@s.whatsapp.net`;
    }

    const result = (await this.socket.onWhatsApp(normalized).catch(() => [])) ?? [];
    return result.find((item) => item.exists)?.jid ?? `${normalized}@s.whatsapp.net`;
  }
}

function unwrapMessage(message: proto.IMessage): proto.IMessage {
  return message.ephemeralMessage?.message ?? message.viewOnceMessage?.message ?? message;
}

function contentText(message?: proto.IMessage | null): string | undefined {
  if (!message) {
    return undefined;
  }
  const content = unwrapMessage(message);
  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.documentMessage?.caption ??
    content.imageMessage?.caption ??
    undefined
  );
}

function safeContentText(message?: proto.IMessage | null): string | undefined {
  try {
    return contentText(message);
  } catch (error) {
    logger.error({ err: error }, "Failed to read WhatsApp message text");
    return undefined;
  }
}

function isOwnerCloudUpdateCommand(senderPhone: string, text: string): boolean {
  if (!isOwnerPhone(senderPhone)) return false;
  const normalized = normalizeOwnerCommand(text);

  return new Set([
    "עדכן",
    "עדכון",
    "ענן",
    "עדכן ענן",
    "עדכון ענן",
    "up",
    "upd",
    "update",
    "cloud",
    "myup",
    "mypc update",
    "my pc update"
  ]).has(normalized);
}

function isOwnerLogExportCommand(senderPhone: string, text: string): boolean {
  if (!isOwnerPhone(senderPhone)) return false;
  const normalized = normalizeOwnerCommand(text);

  return new Set(["223", "log 223", "logs 223", "לוגים 223", "logs", "log", "לוגים"]).has(normalized);
}

function isOwnerVersionCommand(senderPhone: string, text: string): boolean {
  if (!isOwnerPhone(senderPhone)) return false;
  return new Set(["ver", "version", "v", "גרסה", "גירסה", "איזה גרסה", "מה הגרסה"]).has(normalizeOwnerCommand(text));
}

function isOwnerStatusCommand(senderPhone: string, text: string): boolean {
  if (!isOwnerPhone(senderPhone)) return false;
  return new Set(["status", "stat", "st", "סטטוס", "מצב", "שרת", "server"]).has(normalizeOwnerCommand(text));
}

function isOwnerCommandMapCommand(senderPhone: string, text: string): boolean {
  if (!isOwnerPhone(senderPhone)) return false;
  return new Set(["help", "commands", "cmd", "פקודות", "עזרה", "מפה", "map"]).has(normalizeOwnerCommand(text));
}

function isOwnerFullDiagnosticsCommand(senderPhone: string, text: string): boolean {
  if (!isOwnerPhone(senderPhone)) return false;
  return new Set(["all", "full", "diag", "diagnostics", "הכל", "אבחון", "דיאגנוסטיקה"]).has(normalizeOwnerCommand(text));
}

function isOwnerScreenshotCommand(senderPhone: string, text: string): boolean {
  if (!isOwnerPhone(senderPhone)) return false;
  return new Set(["screen", "screenshot", "ss", "צילום מסך", "מסך", "צלם מסך"]).has(normalizeOwnerCommand(text));
}

function isOwnerRemoteSupportCommand(senderPhone: string, text: string): boolean {
  if (!isOwnerPhone(senderPhone)) return false;
  return new Set([
    "tv",
    "qs",
    "teamviewer",
    "team viewer",
    "teamviewer qs",
    "support",
    "remote",
    "remote support",
    "תמיכה",
    "תמיכה מרחוק",
    "טים",
    "טים ויואר",
    "טימויואר",
    "טימוויואר",
    "פתח תמיכה"
  ]).has(normalizeOwnerCommand(text));
}

function isOwnerPhone(senderPhone: string): boolean {
  return new Set(["0522250223", "972522250223", "522250223"]).has(normalizePhone(senderPhone));
}

function normalizeOwnerCommand(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[.!?؟،,;:״"']/g, "")
    .replace(/\s+/g, " ");
}

function ownerCommandMapText(): string {
  return [
    "🧭 פקודות ניהול MY-PC",
    "",
    "עדכון ענן:",
    "עדכן | עדכון | ענן | update | upd | up | mypc update",
    "",
    "גרסה:",
    "גרסה | גירסה | ver | version | v",
    "",
    "סטטוס שרת:",
    "סטטוס | מצב | status | stat | st",
    "",
    "לוגים:",
    "223 | לוגים | logs | log 223",
    "",
    "דיאגנוסטיקה מלאה:",
    "הכל | all | full | diag",
    "",
    "צילום מסך:",
    "צילום מסך | מסך | screenshot | screen | ss",
    "",
    "תמיכה מרחוק:",
    "תמיכה | תמיכה מרחוק | qs | tv | teamviewer | support",
    "",
    "מפת פקודות:",
    "פקודות | עזרה | help | commands | cmd",
    "",
    "כל הפקודות האלה עובדות רק מהמספר המורשה של MY-PC."
  ].join("\n");
}

function logMimeType(fileName: string): string {
  const extension = path.extname(fileName).toLowerCase();
  if (extension === ".json") {
    return "application/json";
  }
  if (extension === ".log" || extension === ".txt") {
    return "text/plain";
  }
  return "application/octet-stream";
}

function mimeToExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/jpeg": "jpg",
    "image/png": "png"
  };
  return map[mimeType] ?? "bin";
}

function customerPrintSuccessMessage(): string {
  return [
    "✅ הקובץ התקבל ונשלח להדפסה בהצלחה.",
    "ניתן להגיע לאיסוף ההדפסה בעוד כ־5 דקות.",
    "תודה שבחרתם בשירות ההדפסה שלנו."
  ].join("\n");
}

function customerFollowUpMessage(): string {
  return [
    "מערכת זו פותחה ומתוחזקת על ידי",
    "",
    "MY-PC – מחברים אותך לעולם הטכנולוגי",
    "",
    "🌐 אתר החברה:",
    "[https://my-pc.co.il](https://my-pc.co.il)",
    "",
    "אנו מזמינים אתכם לבקר באתר ולהכיר את מגוון השירותים והפתרונות שאנו מציעים.",
    "",
    "📱 ליצירת קשר ב-WhatsApp:",
    "052-225-0223",
    "",
    "השירותים שלנו",
    "",
    "✔ מכירה ושדרוג מחשבים",
    "✔ תיקון ותחזוקת מחשבים",
    "✔ ניהול מערכות מחשוב ושרתים",
    "✔ פיתוח מערכות ותוכנות בהתאמה אישית",
    "",
    "© כל הזכויות שמורות ל־MY-PC – מחברים אותך לעולם הטכנולוגי."
  ].join("\n");
}
