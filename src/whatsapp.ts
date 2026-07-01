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
      if (!this.socket) {
        throw new Error("WhatsApp is not connected");
      }
      await this.socket.sendMessage(remoteJid, { text });
    });
  }

  getState(): WhatsAppRuntimeState {
    return this.state;
  }

  onStatus(listener: StatusListener): void {
    this.listeners.add(listener);
  }

  async start(): Promise<void> {
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
      if (!this.socket) {
        throw new Error("WhatsApp is not connected");
      }
      await this.socket.sendMessage(`${phone}@s.whatsapp.net`, { text });
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
        const shouldReconnect = !this.intentionalStop && reason !== DisconnectReason.loggedOut;
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

    const content = unwrapMessage(message.message);
    const document = content.documentMessage;
    const image = content.imageMessage;
    const mediaMessage = document ?? image;
    if (!mediaMessage) {
      const text = safeContentText(message.message);
      if (text) {
        const remoteJid = message.key.remoteJid ?? "";
        const senderJid = message.key.participant ?? message.key.remoteJid ?? "";
        const senderPhone = normalizePhone(senderJid.split("@")[0] ?? "");
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
    const senderJid = message.key.participant ?? message.key.remoteJid ?? "";
    const senderPhone = normalizePhone(senderJid.split("@")[0] ?? "");
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
