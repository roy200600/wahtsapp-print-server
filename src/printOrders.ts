import type { AppConfig, FieryHotFolderEntry, IncomingAttachment, PrintLogEntry } from "./types.js";
import { registerAttachment, printRegisteredAttachment } from "./jobProcessor.js";
import { countAttachmentPages } from "./pageCounter.js";
import { sendSystemAlert } from "./alerts.js";
import { setPrintStatus } from "./db.js";
import { logger } from "./logger.js";
import { adminIncomingPrintMessage, queuedMessage, renderCustomerMessage } from "./customerMessages.js";
import { getLicenseStatus } from "./license.js";
import { getFieryHotFolderRouting } from "./fieryHotFolders.js";
import { normalizePhone } from "./config.js";

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

interface PendingFieryHotFolderSelection {
  order: PendingPrintOrder;
  folders: FieryHotFolderEntry[];
  createdAt: number;
}

const reminderMs = 10 * 60 * 1000;
const expiryMs = 30 * 60 * 1000;

export class PrintOrderManager {
  private readonly orders = new Map<string, PendingPrintOrder>();
  private readonly fierySelections = new Map<string, PendingFieryHotFolderSelection>();

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
    if (this.isManagerPhone(phone) && await this.receiveFieryManagerChoice(remoteJid, text)) {
      return true;
    }

    const order = this.orders.get(phone);
    if (!order) {
      return false;
    }

    order.remoteJid = remoteJid;
    order.updatedAt = Date.now();
    const command = classifyCustomerCommand(text);
    if (command === "print") {
      await this.startPrintOrder(order);
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

  private async startPrintOrder(order: PendingPrintOrder): Promise<void> {
    if (order.isPrinting) {
      return;
    }

    order.isPrinting = true;
    this.clearTimers(order);
    const context = this.context(order);
    await this.safeSend(order.remoteJid, queuedMessage(this.getConfig(), context));
    void sendSystemAlert("הדפסה נכנסה", adminIncomingPrintMessage(context));

    try {
      const routing = await getFieryHotFolderRouting(this.getConfig());
      if (routing && routing.folders.length > 1 && routing.profile.fieryHotFolders.askManager) {
        await this.askManagerForFieryHotFolder(order, routing.folders);
        return;
      }

      await this.completePrintOrder(order, routing?.folders[0]);
    } catch (error) {
      await this.failOrder(order, error instanceof Error ? error.message : String(error));
    }
  }

  private async completePrintOrder(order: PendingPrintOrder, fieryFolder?: FieryHotFolderEntry): Promise<void> {
    const results: PrintLogEntry[] = [];
    for (const attachment of order.attachments) {
      const routedAttachment = fieryFolder
        ? {
            ...attachment,
            fieryHotFolderPath: fieryFolder.path,
            fieryHotFolderLabel: fieryFolder.label
          }
        : attachment;
      results.push(await printRegisteredAttachment(routedAttachment, this.getConfig));
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

  private async askManagerForFieryHotFolder(order: PendingPrintOrder, folders: FieryHotFolderEntry[]): Promise<void> {
    const managerPhone = normalizePhone(this.getConfig().alertsPhone || "");
    if (!managerPhone) {
      await this.failOrder(order, "Fiery Hot Folder selection requires an alerts phone for the system manager.");
      return;
    }

    this.fierySelections.set(order.phone, { order, folders, createdAt: Date.now() });
    await this.safeSend(`${managerPhone}@s.whatsapp.net`, fieryManagerQuestion(this.context(order), folders));
  }

  private async receiveFieryManagerChoice(remoteJid: string, text: string): Promise<boolean> {
    const pending = [...this.fierySelections.values()].sort((left, right) => left.createdAt - right.createdAt)[0];
    if (!pending) {
      return false;
    }

    const choice = parseManagerChoice(text);
    if (!choice || choice < 1 || choice > pending.folders.length) {
      await this.safeSend(
        remoteJid,
        fieryManagerQuestion(this.context(pending.order), pending.folders, "בחירה לא תקינה. יש להשיב במספר מהרשימה.")
      );
      return true;
    }

    const folder = pending.folders[choice - 1];
    this.fierySelections.delete(pending.order.phone);
    await this.safeSend(remoteJid, `נבחרה תיקיית Fiery: ${folder.label} (${folder.paperSize}). הקבצים יועתקו עכשיו.`);
    await this.completePrintOrder(pending.order, folder);
    return true;
  }

  private async failOrder(order: PendingPrintOrder, reason: string): Promise<void> {
    this.clearTimers(order);
    this.fierySelections.delete(order.phone);
    for (const attachment of order.attachments) {
      setPrintStatus(attachment.id, "failed", reason, this.getConfig().printerName);
    }
    sendSystemAlert("הדפסה נכשלה", reason);
    await this.safeSend(order.remoteJid, this.getConfig().customerMessages.failed);
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
    this.fierySelections.delete(order.phone);
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

  private isManagerPhone(phone: string): boolean {
    const managerPhone = normalizePhone(this.getConfig().alertsPhone || "");
    return Boolean(managerPhone && normalizePhone(phone) === managerPhone);
  }
}

function fieryManagerQuestion(
  context: { phone: string; files: number; pages: number },
  folders: FieryHotFolderEntry[],
  header = "נדרשת בחירת תיקיית Fiery"
): string {
  return [
    header,
    "",
    "לקוח:",
    context.phone,
    "",
    "קבצים:",
    String(context.files),
    "עמודים:",
    String(context.pages),
    "",
    "בחר לאיזו תיקייה להעתיק את הקבצים:",
    ...folders.map((folder, index) => `${index + 1} - ${folder.label} | ${folder.paperSize} | ${folder.path}`),
    "",
    "השב במספר בלבד."
  ].join("\n");
}

function parseManagerChoice(text: string): number | undefined {
  const match = text.trim().match(/\d+/);
  if (!match) {
    return undefined;
  }
  const value = Number(match[0]);
  return Number.isInteger(value) ? value : undefined;
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
