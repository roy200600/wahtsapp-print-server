import type { AppConfig, IncomingAttachment, PrintLogEntry } from "./types.js";
import { registerAttachment, printRegisteredAttachment } from "./jobProcessor.js";
import { countAttachmentPages } from "./pageCounter.js";
import { sendSystemAlert } from "./alerts.js";
import { setPrintStatus } from "./db.js";
import { logger } from "./logger.js";
import { adminIncomingPrintMessage, queuedMessage, renderCustomerMessage } from "./customerMessages.js";

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
  isPrinting: boolean;
  createdAt: number;
  updatedAt: number;
}

const reminderMs = 10 * 60 * 1000;
const expiryMs = 30 * 60 * 1000;

export class PrintOrderManager {
  private readonly orders = new Map<string, PendingPrintOrder>();

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
    order.attachments.push(entry);
    order.updatedAt = Date.now();
    order.pageCounts.set(entry.id, await countAttachmentPages(entry));
    this.resetTimers(order);

    const message =
      order.attachments.length === 1
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

    order.isPrinting = true;
    this.clearTimers(order);
    const context = this.context(order);
    await this.safeSend(order.remoteJid, queuedMessage(this.getConfig(), context));
    void sendSystemAlert("התפסה נכנסה", adminIncomingPrintMessage(context));

    const results: PrintLogEntry[] = [];
    for (const attachment of order.attachments) {
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
  }

  private clearTimers(order: PendingPrintOrder): void {
    if (order.reminderTimer) clearInterval(order.reminderTimer);
    if (order.expiryTimer) clearTimeout(order.expiryTimer);
    if (order.promoTimer) clearTimeout(order.promoTimer);
    order.reminderTimer = undefined;
    order.expiryTimer = undefined;
    order.promoTimer = undefined;
  }

  private context(order: PendingPrintOrder): { phone: string; files: number; pages: number } {
    const counts = [...order.pageCounts.values()];
    return {
      phone: order.phone,
      files: order.attachments.length,
      pages: Math.max(1, counts.reduce((sum, count) => sum + count, 0))
    };
  }

  private async safeSend(remoteJid: string, text: string): Promise<void> {
    try {
      await this.sendMessage(remoteJid, text);
    } catch (error) {
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
