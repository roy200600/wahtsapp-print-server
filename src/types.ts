export type PrintStatus = "received" | "printed" | "failed" | "rejected";

export type PdfColorMode = "color" | "grayscale";
export type PdfDuplexMode = "simplex" | "long-edge" | "short-edge";
export type PdfOrientation = "auto" | "portrait" | "landscape";
export type PdfScaling = "fill-page" | "fit" | "actual-size" | "shrink";
export type PdfPrintQuality = "draft" | "normal" | "high";

export interface PdfPrintProfile {
  colorMode: PdfColorMode;
  duplex: PdfDuplexMode;
  orientation: PdfOrientation;
  paperSize: string;
  scaling: PdfScaling;
  scalePercent: number;
  copies: number;
  dpi: number;
  quality: PdfPrintQuality;
  compatibilityMode: boolean;
}

export interface AppConfig {
  printerName: string;
  language: "he" | "en";
  adminPassword: string;
  allowedNumbers: string[];
  allowedGroups: string[];
  allowedFileTypes: string[];
  maxFileSizeMB: number;
  autoPrint: boolean;
  deleteAfterPrint: boolean;
  sendWhatsappReply: boolean;
  allowGroupPrinting: boolean;
  customerMessages: CustomerMessagesConfig;
  customerMarketing: CustomerMarketingConfig;
  copies: number;
  duplex: boolean;
  color: boolean;
  sumatraPdfPath: string;
  pdfPrintProfile: PdfPrintProfile;
  officePrintProfile: OfficePrintProfile;
  printerRoles: PrinterRolesConfig;
  printerProfiles: PrinterProfileConfig[];
  pricing: PricingConfig;
  email: EmailConfig;
  branding: BrandingConfig;
  alertsEnabled: boolean;
  alertsPhone: string;
  port: number;
}

export interface OfficePrintProfile {
  excelOrientation: PdfOrientation;
  powerPointOrientation: PdfOrientation;
  fitToWidth: boolean;
  paperSize: string;
}

export interface PrinterRolesConfig {
  defaultPrinter: string;
  blackWhitePrinter: string;
  colorPrinter: string;
  askColorPreference: boolean;
}

export type PrinterProfileRole = "default" | "blackWhite" | "color" | "special";

export interface PrinterProfileConfig {
  id: string;
  displayName: string;
  printerName: string;
  role: PrinterProfileRole;
  isPrimary: boolean;
  askCustomerColor: boolean;
  printProfile: PdfPrintProfile;
  officeProfile: OfficePrintProfile;
}

export interface PricingConfig {
  enabled: boolean;
  blackWhiteFirstPage: number;
  blackWhiteAdditionalPage: number;
  colorFirstPage: number;
  colorAdditionalPage: number;
  minimumOrder: number;
  duplexDiscountPercent: number;
}

export interface EmailConfig {
  enabled: boolean;
  gmailAddress: string;
  appPassword: string;
  managerEmail: string;
  sendWhenWhatsappDisconnected: boolean;
}

export interface BrandingConfig {
  footerText: string;
  footerUrl: string;
  footerUrlLabel: string;
}

export interface CustomerMessagesConfig {
  orderPrompt: string;
  fileAdded: string;
  queued: string;
  printed: string;
  canceled: string;
  expired: string;
  reminder: string;
  failed: string;
  promo: string;
}

export interface CustomerMarketingConfig {
  enabled: boolean;
  message: string;
  delayMinutes: number;
}

export interface IncomingAttachment {
  id: string;
  chatId: string;
  senderName: string;
  senderPhone: string;
  groupName?: string;
  fileName: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  filePath: string;
  messageText?: string;
  messageKey: string;
}

export interface PrintLogEntry extends IncomingAttachment {
  createdAt: string;
  printerName: string;
  status: PrintStatus;
  failureReason?: string;
}
