import os from "node:os";
import type { AppConfig, IncomingAttachment, PrintLogEntry } from "./types.js";
import { failRegisteredAttachment, registerAttachment, printRegisteredAttachment } from "./jobProcessor.js";
import { countAttachmentPages } from "./pageCounter.js";
import { sendSystemAlert } from "./alerts.js";
import { setPrintStatus } from "./db.js";
import { logger } from "./logger.js";
import { adminIncomingPrintMessage, queuedMessage, renderCustomerMessage } from "./customerMessages.js";
import { getLicenseStatus } from "./license.js";
import { extractPdfPassword, isPasswordProtectedPdf, verifyPdfPassword } from "./pdfSecurity.js";

type SendMessage = (remoteJid: string, text: string) => Promise<void>;

interface PendingPrintOrder {
  phone: string;
  remoteJid: string;
  senderName: string;
  attachments: PrintLogEntry[];
  pageCounts: Map<string, number>;
  reminderTimer?: NodeJS.Timeout;
  expiryTimer?: NodeJS.Timeout;
  promoTimer?: NodeJS.Timeout;
  customerMarketingTimer?: NodeJS.Timeout;
  isPrinting: boolean;
  createdAt: number;
  updatedAt: number;
}

const reminderMs = 10 * 60 * 1000;
const expiryMs = 30 * 60 * 1000;
const sendFailureWarningThrottleMs = 15 * 60 * 1000;

export class PrintOrderManager {
  private readonly orders = new Map<string, PendingPrintOrder>();
  private readonly sendFailureWarnings = new Map<string, number>();

  constructor(
    private readonly getConfig: () => AppConfig,
    private readonly sendMessage: SendMessage
  ) {}

  async receiveAttachment(attachment: IncomingAttachment): Promise<void> {
    const entry = await registerAttachment(attachment, this.getConfig);
    if (entry.status !== "received") {
      await this.safeSend(attachment.chatId, this.getConfig().customerMessages.failed);
      return;
    }

    const order = this.getOrCreateOrder(entry);
    order.remoteJid = entry.chatId;
    order.senderName = entry.senderName;
    order.updatedAt = Date.now();

    const ready = await this.addAttachmentToOrder(order, entry);
    if (!ready) {
      if (order.attachments.length === 0) {
        this.orders.delete(order.phone);
      }
      return;
    }

    this.resetTimers(order);
    const message =
      ready.readyCount === 1
        ? this.getConfig().customerMessages.orderPrompt
        : this.getConfig().customerMessages.fileAdded;
    await this.safeSend(order.remoteJid, message);
  }

  async receiveText(phone: string, remoteJid: string, text: string): Promise<boolean> {
    const order = this.orders.get(phone);
    if (!order) {
      return false;
    }

    order.remoteJid = remoteJid;
    order.updatedAt = Date.now();

    const pendingPassword = this.nextPasswordProtectedAttachment(order);
    if (pendingPassword) {
      await this.handlePdfPasswordReply(order, pendingPassword, text);
      return true;
    }

    const command = classifyCustomerCommand(text);
    if (command === "print") {
      await this.printOrder(order);
      return true;
    }

    if (command === "more") {
      this.resetTimers(order);
      await this.safeSend(remoteJid, this.getConfig().customerMessages.fileAdded);
      return true;
    }

    if (command === "cancel") {
      this.cancelOrder(order, "Customer canceled print order", this.getConfig().customerMessages.canceled, true);
      return true;
    }

    await this.safeSend(remoteJid, this.getConfig().customerMessages.reminder);
    return true;
  }

  private async addAttachmentToOrder(
    order: PendingPrintOrder,
    entry: PrintLogEntry
  ): Promise<{ readyCount: number } | undefined> {
    if (entry.extension.toLowerCase() === "pdf" && isPasswordProtectedPdf(entry.filePath)) {
      entry.pdfPasswordRequired = true;
      const password = extractPdfPassword(entry.messageText, false);

      if (!password) {
        order.attachments.push(entry);
        this.resetTimers(order);
        await this.safeSend(order.remoteJid, pdfPasswordPrompt(entry));
        return undefined;
      }

      const verified = await verifyPdfPassword(entry.filePath, password, this.getConfig().sumatraPdfPath);
      if (!verified.ok) {
        this.failPasswordProtectedPdf(entry, verified.reason);
        await this.safeSend(order.remoteJid, this.getConfig().customerMessages.failed);
        return undefined;
      }

      entry.pdfPassword = password;
    }

    order.attachments.push(entry);
    order.pageCounts.set(entry.id, await countAttachmentPages(entry));
    return { readyCount: this.readyAttachments(order).length };
  }

  private async handlePdfPasswordReply(
    order: PendingPrintOrder,
    attachment: PrintLogEntry,
    text: string
  ): Promise<void> {
    const password = extractPdfPassword(text, true);
    if (!password) {
      await this.safeSend(order.remoteJid, pdfPasswordPrompt(attachment));
      return;
    }

    const verified = await verifyPdfPassword(attachment.filePath, password, this.getConfig().sumatraPdfPath);
    if (!verified.ok) {
      this.failPasswordProtectedPdf(attachment, verified.reason);
      order.attachments = order.attachments.filter((item) => item.id !== attachment.id);
      order.pageCounts.delete(attachment.id);
      await this.safeSend(order.remoteJid, this.getConfig().customerMessages.failed);
      if (order.attachments.length === 0) {
        this.clearTimers(order);
        this.orders.delete(order.phone);
      }
      return;
    }

    attachment.pdfPassword = password;
    order.pageCounts.set(attachment.id, await countAttachmentPages(attachment));
    this.resetTimers(order);
    await this.safeSend(order.remoteJid, pdfPasswordAcceptedMessage(order));
  }

  private failPasswordProtectedPdf(attachment: PrintLogEntry, reason: string): void {
    const failed = failRegisteredAttachment(attachment, this.getConfig, reason);
    sendSystemAlert("PDF מוגן בסיסמה לא הודפס", reason, attachmentAlertContext(failed, this.getConfig()));
    logger.warn({ attachmentId: attachment.id, reason }, "Password-protected PDF was rejected");
  }

  private getOrCreateOrder(entry: PrintLogEntry): PendingPrintOrder {
    const existing = this.orders.get(entry.senderPhone);
    if (existing && !existing.isPrinting) {
      return existing;
    }

    const order: PendingPrintOrder = {
      phone: entry.senderPhone,
      remoteJid: entry.chatId,
      senderName: entry.senderName,
      attachments: [],
      pageCounts: new Map(),
      isPrinting: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    this.orders.set(entry.senderPhone, order);
    return order;
  }

  private async printOrder(order: PendingPrintOrder): Promise<void> {
    if (order.isPrinting) {
      return;
    }

    const pendingPassword = this.nextPasswordProtectedAttachment(order);
    if (pendingPassword) {
      await this.safeSend(order.remoteJid, pdfPasswordPrompt(pendingPassword));
      return;
    }

    const readyAttachments = this.readyAttachments(order);
    if (readyAttachments.length === 0) {
      await this.safeSend(order.remoteJid, this.getConfig().customerMessages.failed);
      this.orders.delete(order.phone);
      return;
    }

    order.isPrinting = true;
    this.clearTimers(order);
    const context = this.context(order);
    await this.safeSend(order.remoteJid, queuedMessage(this.getConfig(), context));
    void sendSystemAlert("התפסה נכנסה", adminIncomingPrintMessage(context), {
      customerName: order.senderName,
      customerPhone: order.phone,
      printerName: this.getConfig().printerName,
      computerName: os.hostname(),
      extra: { files: context.files, pages: context.pages }
    });

    const results: PrintLogEntry[] = [];
    for (const attachment of readyAttachments) {
      results.push(await printRegisteredAttachment(attachment, this.getConfig));
    }

    const failed = results.filter((result) => result.status !== "printed");
    if (failed.length === 0) {
      await this.safeSend(
        order.remoteJid,
        renderCustomerMessage(this.getConfig().customerMessages.printed, this.context(order))
      );
      this.schedulePromo(order);
    } else {
      await this.safeSend(order.remoteJid, this.getConfig().customerMessages.failed);
    }

    if (this.orders.get(order.phone) === order) {
      this.orders.delete(order.phone);
    }
  }

  private resetTimers(order: PendingPrintOrder): void {
    this.clearTimers(order);
    order.reminderTimer = setInterval(() => {
      void this.safeSend(order.remoteJid, this.getConfig().customerMessages.reminder);
    }, reminderMs);
    order.expiryTimer = setTimeout(() => {
      this.cancelOrder(order, "Print order expired before customer approval", this.getConfig().customerMessages.expired, true);
    }, expiryMs);
  }

  private cancelOrder(order: PendingPrintOrder, reason: string, message: string, sendPromo: boolean): void {
    this.clearTimers(order);
    for (const attachment of order.attachments) {
      setPrintStatus(attachment.id, "rejected", reason, this.getConfig().printerName);
    }
    void this.safeSend(order.remoteJid, message);
    if (sendPromo) {
      this.schedulePromo(order);
    }
    this.orders.delete(order.phone);
  }

  private schedulePromo(order: PendingPrintOrder): void {
    order.promoTimer = setTimeout(() => {
      void this.safeSend(order.remoteJid, this.getConfig().customerMessages.promo);
    }, reminderMs);
    const marketing = this.getConfig().customerMarketing;
    const delayMinutes = Number(marketing?.delayMinutes) || 0;
    if (getLicenseStatus().mode === "licensed" && marketing?.enabled && marketing.message && delayMinutes > 0 && delayMinutes !== 10) {
      order.customerMarketingTimer = setTimeout(() => {
        void this.safeSend(order.remoteJid, marketing.message);
      }, delayMinutes * 60 * 1000);
    }
  }

  private clearTimers(order: PendingPrintOrder): void {
    if (order.reminderTimer) clearInterval(order.reminderTimer);
    if (order.expiryTimer) clearTimeout(order.expiryTimer);
    if (order.promoTimer) clearTimeout(order.promoTimer);
    if (order.customerMarketingTimer) clearTimeout(order.customerMarketingTimer);
    order.reminderTimer = undefined;
    order.expiryTimer = undefined;
    order.promoTimer = undefined;
    order.customerMarketingTimer = undefined;
  }

  private context(order: PendingPrintOrder): { phone: string; files: number; pages: number } {
    const counts = [...order.pageCounts.values()];
    return {
      phone: order.phone,
      files: this.readyAttachments(order).length,
      pages: Math.max(1, counts.reduce((sum, count) => sum + count, 0))
    };
  }

  private nextPasswordProtectedAttachment(order: PendingPrintOrder): PrintLogEntry | undefined {
    return order.attachments.find((attachment) => attachment.pdfPasswordRequired && !attachment.pdfPassword);
  }

  private readyAttachments(order: PendingPrintOrder): PrintLogEntry[] {
    return order.attachments.filter((attachment) => !attachment.pdfPasswordRequired || Boolean(attachment.pdfPassword));
  }

  private async safeSend(remoteJid: string, text: string): Promise<void> {
    try {
      await this.sendMessage(remoteJid, text);
    } catch (error) {
      if (isWhatsAppDisconnectedError(error)) {
        const now = Date.now();
        const lastWarningAt = this.sendFailureWarnings.get(remoteJid) ?? 0;
        if (now - lastWarningAt > sendFailureWarningThrottleMs) {
          this.sendFailureWarnings.set(remoteJid, now);
          logger.warn({ remoteJid }, "Customer message skipped because WhatsApp is disconnected");
        }
        return;
      }

      logger.error({ err: error, remoteJid }, "Failed to send customer print order message");
    }
  }
}

function classifyCustomerCommand(text: string): "print" | "more" | "cancel" | "unknown" {
  const normalized = text
    .trim()
    .toLowerCase()
    .replace(/[.!?؟،,;:״"']/g, "")
    .replace(/\s+/g, " ");
  if (!normalized) return "unknown";
  if (["1", "סיימתי", "סיים", "הדפס", "להדפיס", "ok", "okay", "done", "print", "finish", "finished"].includes(normalized)) {
    return "print";
  }
  if (["2", "עוד", "יש עוד", "עוד קבצים", "לא", "no", "more", "wait"].includes(normalized)) {
    return "more";
  }
  if (["ביטול הדפסה", "ביטול", "בטל", "cancel", "stop", "cancel print"].includes(normalized)) {
    return "cancel";
  }
  return "unknown";
}

function isWhatsAppDisconnectedError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("WhatsApp is not connected");
}

function pdfPasswordPrompt(attachment: PrintLogEntry): string {
  return [
    "הקובץ שהתקבל מוגן בסיסמה:",
    attachment.fileName,
    "",
    "כדי שנוכל להדפיס אותו, יש לשלוח את סיסמת הקובץ בהודעה חוזרת.",
    "לדוגמה:",
    "סיסמה 1234",
    "",
    "הקובץ לא יודפס עד שהסיסמה תיבדק ותימצא תקינה."
  ].join("\n");
}

function pdfPasswordAcceptedMessage(order: PendingPrintOrder): string {
  const pending = order.attachments.filter((attachment) => attachment.pdfPasswordRequired && !attachment.pdfPassword).length;
  return [
    "סיסמת ה־PDF התקבלה ונבדקה בהצלחה.",
    pending > 0 ? `נשארו עוד ${pending} קבצים שממתינים לסיסמה.` : "אפשר להמשיך.",
    "",
    "אם סיימת לשלוח קבצים כתוב 1 או סיימתי.",
    "אם יש עוד קבצים כתוב 2."
  ].join("\n");
}

function attachmentAlertContext(attachment: PrintLogEntry, config: AppConfig) {
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
