import type { AppConfig } from "./types.js";

export interface MessageContext {
  files?: number;
  pages?: number;
  phone?: string;
}

export function renderCustomerMessage(template: string, context: MessageContext = {}): string {
  const pages = context.pages === undefined ? "1" : String(context.pages);
  const files = context.files === undefined ? "0" : String(context.files);
  return template
    .replaceAll("{files}", files)
    .replaceAll("{pages}", pages)
    .replaceAll("{phone}", context.phone ?? "");
}

export function queuedMessage(config: AppConfig, context: MessageContext): string {
  const base = renderCustomerMessage(config.customerMessages.queued, context);
  return [base, "", `כמות קבצים: ${context.files ?? 0}`, `כמות דפים: ${context.pages ?? 1}`].join("\n");
}

export function adminIncomingPrintMessage(context: Required<Pick<MessageContext, "phone" | "files">> & { pages?: number }): string {
  return [
    "הדפסה נכנסה",
    "",
    `מספר לקוח: ${context.phone}`,
    `כמות קבצים: ${context.files}`,
    `כמות דפים: ${context.pages ?? 1}`
  ].join("\n");
}
