import fs from "node:fs";
import { appPaths, settingsPath } from "./paths.js";
import type { AppConfig, FieryHotFolderDestination, PdfPrintProfile, PrinterProfileConfig, PrinterProfileRole } from "./types.js";

export const defaultPdfPrintProfile = {
  colorMode: "color",
  duplex: "simplex",
  orientation: "auto",
  paperSize: "A4",
  scaling: "fill-page",
  scalePercent: 90,
  copies: 1,
  dpi: 600,
  quality: "high",
  compatibilityMode: true
} as const;

export const defaultCustomerMessages = {
  orderPrompt: [
    "הקובץ התקבל.",
    "",
    "האם סיימת לשלוח קבצים?",
    "1 - סיימתי, שלח להדפסה",
    "2 - יש לי עוד קבצים",
    "",
    "לביטול ההדפסה ניתן לכתוב: ביטול הדפסה"
  ].join("\n"),
  fileAdded: [
    "קובץ נוסף התקבל ונשמר להזמנה.",
    "כשתסיים לשלוח קבצים כתוב 1 או סיימתי."
  ].join("\n"),
  queued: [
    "הקובץ התקבל ויודפס לפי תור ההדפסה.",
    "אנא המתן לקבלת הודעה שהקובץ הודפס בהצלחה וניתן להגיע לחנות."
  ].join("\n"),
  printed: "הקובץ הודפס בהצלחה וניתן להגיע לחנות לאסוף אותו.",
  canceled: "הדפסת הקבצים בוטלה לבקשתך.",
  expired: "הזמנת ההדפסה בוטלה כי לא התקבל אישור להדפסה במשך 30 דקות.",
  reminder: [
    "תזכורת: יש לך קבצים שממתינים לאישור הדפסה.",
    "1 - סיימתי, שלח להדפסה",
    "2 - יש לי עוד קבצים",
    "לביטול: ביטול הדפסה"
  ].join("\n"),
  failed: "אירעה תקלה בהדפסת הקובץ. הצוות קיבל התראה ויטפל בכך.",
  promo: [
    "מערכת זו פותחה ומתוחזקת על ידי",
    "",
    "MY-PC – מחברים אותך לעולם הטכנולוגי",
    "",
    "🌐 אתר החברה:",
    "https://my-pc.co.il",
    "",
    "📱 ליצירת קשר ב-WhatsApp:",
    "052-225-0223"
  ].join("\n")
} as const;

export const defaultCustomerMarketing = {
  enabled: false,
  message: "",
  delayMinutes: 5
} as const;

export const defaultConfig: AppConfig = {
  printerName: "",
  language: "he",
  adminPassword: "",
  allowedNumbers: [],
  allowedGroups: [],
  allowedFileTypes: ["pdf", "jpg", "jpeg", "png", "doc", "docx", "rtf", "txt", "csv", "xls", "xlsx", "ppt", "pptx"],
  maxFileSizeMB: 25,
  autoPrint: true,
  deleteAfterPrint: false,
  sendWhatsappReply: false,
  allowGroupPrinting: false,
  customerMessages: defaultCustomerMessages,
  customerMarketing: defaultCustomerMarketing,
  copies: 1,
  duplex: false,
  color: true,
  sumatraPdfPath: `${appPaths.toolsDir}\\SumatraPDF\\SumatraPDF.exe`,
  pdfPrintProfile: defaultPdfPrintProfile,
  officePrintProfile: {
    excelOrientation: "landscape",
    powerPointOrientation: "landscape",
    fitToWidth: true,
    paperSize: "A4"
  },
  printerRoles: {
    defaultPrinter: "",
    blackWhitePrinter: "",
    colorPrinter: "",
    askColorPreference: false
  },
  printerProfiles: [],
  pricing: {
    enabled: false,
    blackWhiteFirstPage: 1,
    blackWhiteAdditionalPage: 0.5,
    colorFirstPage: 3,
    colorAdditionalPage: 2,
    minimumOrder: 0,
    duplexDiscountPercent: 0
  },
  email: {
    enabled: false,
    gmailAddress: "",
    appPassword: "",
    managerEmail: "",
    sendWhenWhatsappDisconnected: false
  },
  branding: {
    footerText: "כל הזכויות שמורות למחשב שלי - מחברים אותך לעולם הטכנולוגי | מחלקת פיתוח",
    footerUrl: "https://my-pc.co.il",
    footerUrlLabel: "my-pc.co.il"
  },
  alertsEnabled: false,
  alertsPhone: "",
  port: 3010
};

export function ensureDirectories(): void {
  for (const dir of Object.values(appPaths)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function loadConfig(): AppConfig {
  ensureDirectories();
  if (!fs.existsSync(settingsPath)) {
    saveConfig(defaultConfig);
    return defaultConfig;
  }

  const parsed = JSON.parse(fs.readFileSync(settingsPath, "utf8").replace(/^\uFEFF/, "")) as Partial<AppConfig>;
  return normalizeConfig({ ...defaultConfig, ...parsed });
}

export function saveConfig(config: AppConfig): AppConfig {
  ensureDirectories();
  const normalized = normalizeConfig(config);
  fs.writeFileSync(settingsPath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function normalizeConfig(config: AppConfig): AppConfig {
  const pdfPrintProfile = normalizePdfPrintProfile(config);
  const customerMessages = normalizeCustomerMessages(config.customerMessages);
  return {
    ...config,
    language: pick(config.language, ["he", "en"], defaultConfig.language),
    adminPassword: String(config.adminPassword || ""),
    allowedNumbers: config.allowedNumbers.map(normalizePhone).filter(Boolean),
    allowedGroups: config.allowedGroups.map((group) => group.trim()).filter(Boolean),
    allowedFileTypes: normalizeAllowedFileTypes(config.allowedFileTypes),
    alertsPhone: normalizeAlertPhone(config.alertsPhone),
    alertsEnabled: Boolean(config.alertsEnabled && normalizeAlertPhone(config.alertsPhone)),
    allowGroupPrinting: Boolean(config.allowGroupPrinting),
    customerMessages,
    customerMarketing: normalizeCustomerMarketing(config.customerMarketing),
    officePrintProfile: normalizeOfficePrintProfile(config.officePrintProfile),
    printerRoles: normalizePrinterRoles(config.printerRoles, config.printerName),
    printerProfiles: normalizePrinterProfiles(config),
    pricing: normalizePricing(config.pricing),
    email: normalizeEmail(config.email),
    branding: normalizeBranding(config.branding),
    maxFileSizeMB: Number(config.maxFileSizeMB) || defaultConfig.maxFileSizeMB,
    copies: Math.max(1, Number(config.copies) || 1),
    sumatraPdfPath: String(config.sumatraPdfPath || defaultConfig.sumatraPdfPath),
    pdfPrintProfile,
    port: Number(config.port) || defaultConfig.port
  };
}

function normalizeBranding(branding: Partial<AppConfig["branding"]> | undefined) {
  const normalized = { ...defaultConfig.branding, ...(branding ?? {}) };
  return {
    footerText: String(normalized.footerText || defaultConfig.branding.footerText),
    footerUrl: String(normalized.footerUrl || defaultConfig.branding.footerUrl),
    footerUrlLabel: String(normalized.footerUrlLabel || defaultConfig.branding.footerUrlLabel)
  };
}

function normalizeAllowedFileTypes(fileTypes: string[] | undefined): string[] {
  const normalized = [...new Set((fileTypes ?? [])
    .map((type) => String(type).toLowerCase().replace(".", "").trim())
    .filter(Boolean))];

  if (normalized.length === 0 || isLegacyBasicFileTypeSet(normalized)) {
    return [...defaultConfig.allowedFileTypes];
  }

  return normalized;
}

function isLegacyBasicFileTypeSet(fileTypes: string[]): boolean {
  const legacy = ["pdf", "jpg", "jpeg", "png"];
  return fileTypes.length === legacy.length && legacy.every((type) => fileTypes.includes(type));
}

function normalizeOfficePrintProfile(profile: Partial<AppConfig["officePrintProfile"]> | undefined) {
  return {
    ...defaultConfig.officePrintProfile,
    ...(profile ?? {}),
    excelOrientation: pick(profile?.excelOrientation, ["auto", "portrait", "landscape"], "landscape"),
    powerPointOrientation: pick(profile?.powerPointOrientation, ["auto", "portrait", "landscape"], "landscape"),
    fitToWidth: profile?.fitToWidth !== false,
    paperSize: normalizePaperSize(profile?.paperSize ?? defaultConfig.officePrintProfile.paperSize)
  };
}

function normalizePrinterRoles(roles: Partial<AppConfig["printerRoles"]> | undefined, printerName: string) {
  const normalized = { ...defaultConfig.printerRoles, ...(roles ?? {}) };
  return {
    defaultPrinter: normalized.defaultPrinter || printerName || "",
    blackWhitePrinter: normalized.blackWhitePrinter || printerName || "",
    colorPrinter: normalized.colorPrinter || "",
    askColorPreference: Boolean(normalized.askColorPreference)
  };
}

function normalizePrinterProfiles(config: AppConfig): PrinterProfileConfig[] {
  const source = Array.isArray(config.printerProfiles) ? config.printerProfiles : [];
  const normalized = source
    .map((profile, index) => normalizePrinterProfile(profile, index, config))
    .filter((profile) => profile.printerName || profile.displayName);

  if (normalized.length > 0) {
    const hasPrimary = normalized.some((profile) => profile.isPrimary);
    return normalized.map((profile, index) => ({
      ...profile,
      isPrimary: hasPrimary ? profile.isPrimary : index === 0
    }));
  }

  if (!config.printerName) {
    return [];
  }

  return [
    {
      id: "primary",
      displayName: "מדפסת ראשית",
      printerName: config.printerName,
      printerType: "windows",
      role: "default",
      isPrimary: true,
      askCustomerColor: false,
      fieryDestinations: [],
      printProfile: normalizePdfPrintProfile(config),
      officeProfile: normalizeOfficePrintProfile(config.officePrintProfile)
    }
  ];
}

function normalizePrinterProfile(
  profile: Partial<PrinterProfileConfig>,
  index: number,
  config: AppConfig
): PrinterProfileConfig {
  return {
    id: String(profile.id || `printer-${index + 1}`),
    displayName: String(profile.displayName || `מדפסת ${index + 1}`).trim(),
    printerName: String(profile.printerName || "").trim(),
    printerType: pick(profile.printerType, ["windows", "fiery"], "windows") as PrinterProfileConfig["printerType"],
    role: pick(profile.role, ["default", "blackWhite", "color", "special"], index === 0 ? "default" : "special") as PrinterProfileRole,
    isPrimary: Boolean(profile.isPrimary),
    askCustomerColor: Boolean(profile.askCustomerColor),
    fieryDestinations: normalizeFieryDestinations(profile.fieryDestinations),
    printProfile: normalizePdfPrintProfile({
      ...config,
      pdfPrintProfile: profile.printProfile ?? config.pdfPrintProfile
    }),
    officeProfile: normalizeOfficePrintProfile(profile.officeProfile ?? config.officePrintProfile)
  };
}

function normalizeFieryDestinations(destinations: FieryHotFolderDestination[] | undefined): FieryHotFolderDestination[] {
  const normalized = (Array.isArray(destinations) ? destinations : [])
    .map((destination, index) => ({
      id: String(destination.id || `fiery-${index + 1}`),
      label: String(destination.label || `יעד Fiery ${index + 1}`).trim(),
      folderPath: String(destination.folderPath || "").trim(),
      shortcutPath: destination.shortcutPath ? String(destination.shortcutPath).trim() : "",
      isDefault: Boolean(destination.isDefault),
      enabled: destination.enabled !== false
    }))
    .filter((destination) => destination.label || destination.folderPath);

  const hasDefault = normalized.some((destination) => destination.isDefault);
  return normalized.map((destination, index) => ({
    ...destination,
    isDefault: hasDefault ? destination.isDefault : index === 0
  }));
}

function normalizePricing(pricing: Partial<AppConfig["pricing"]> | undefined) {
  const normalized = { ...defaultConfig.pricing, ...(pricing ?? {}) };
  return {
    enabled: Boolean(normalized.enabled),
    blackWhiteFirstPage: Math.max(0, Number(normalized.blackWhiteFirstPage) || 0),
    blackWhiteAdditionalPage: Math.max(0, Number(normalized.blackWhiteAdditionalPage) || 0),
    colorFirstPage: Math.max(0, Number(normalized.colorFirstPage) || 0),
    colorAdditionalPage: Math.max(0, Number(normalized.colorAdditionalPage) || 0),
    minimumOrder: Math.max(0, Number(normalized.minimumOrder) || 0),
    duplexDiscountPercent: Math.max(0, Math.min(100, Number(normalized.duplexDiscountPercent) || 0))
  };
}

function normalizeEmail(email: Partial<AppConfig["email"]> | undefined) {
  const normalized = { ...defaultConfig.email, ...(email ?? {}) };
  return {
    enabled: Boolean(normalized.enabled),
    gmailAddress: String(normalized.gmailAddress || "").trim(),
    appPassword: String(normalized.appPassword || ""),
    managerEmail: String(normalized.managerEmail || "").trim(),
    sendWhenWhatsappDisconnected: Boolean(normalized.sendWhenWhatsappDisconnected)
  };
}

function normalizeCustomerMessages(messages: Partial<AppConfig["customerMessages"]> | undefined) {
  return {
    ...defaultCustomerMessages,
    ...(messages ?? {}),
    promo: defaultCustomerMessages.promo
  };
}

function normalizeCustomerMarketing(marketing: Partial<AppConfig["customerMarketing"]> | undefined) {
  const normalized = { ...defaultCustomerMarketing, ...(marketing ?? {}) };
  const delayMinutes = Number(normalized.delayMinutes);
  return {
    enabled: Boolean(normalized.enabled && String(normalized.message || "").trim()),
    message: String(normalized.message || "").trim(),
    delayMinutes: normalizeMarketingDelay(delayMinutes)
  };
}

function normalizeMarketingDelay(value: number): number {
  if (!Number.isFinite(value)) return defaultCustomerMarketing.delayMinutes;
  const rounded = Math.max(1, Math.min(60, Math.floor(value)));
  return rounded === 10 ? 11 : rounded;
}

function normalizeAlertPhone(phone: string): string {
  const trimmed = String(phone ?? "").trim();
  const normalized = trimmed.startsWith("05") ? `972${trimmed.slice(1)}` : trimmed;
  return /^[1-9]\d{7,14}$/.test(normalized) ? normalized : "";
}

function normalizePdfPrintProfile(config: Partial<AppConfig>) {
  const profile: Partial<PdfPrintProfile> = config.pdfPrintProfile ?? {};
  const copies = Number(profile.copies ?? config.copies ?? defaultPdfPrintProfile.copies);
  const dpi = Number(profile.dpi ?? defaultPdfPrintProfile.dpi);
  const scalePercent = Number(profile.scalePercent ?? defaultPdfPrintProfile.scalePercent);
  return {
    colorMode: pick(profile.colorMode, ["color", "grayscale"], config.color === false ? "grayscale" : defaultPdfPrintProfile.colorMode),
    duplex: pick(
      profile.duplex,
      ["simplex", "long-edge", "short-edge"],
      config.duplex ? "long-edge" : defaultPdfPrintProfile.duplex
    ),
    orientation: pick(profile.orientation, ["auto", "portrait", "landscape"], defaultPdfPrintProfile.orientation),
    paperSize: normalizePaperSize(profile.paperSize),
    scaling: pick(profile.scaling, ["fill-page", "fit", "actual-size", "shrink"], defaultPdfPrintProfile.scaling),
    scalePercent: Math.max(
      50,
      Math.min(200, Number.isFinite(scalePercent) ? Math.floor(scalePercent) : defaultPdfPrintProfile.scalePercent)
    ),
    copies: Math.max(1, Math.min(99, Number.isFinite(copies) ? Math.floor(copies) : defaultPdfPrintProfile.copies)),
    dpi: Math.max(72, Math.min(2400, Number.isFinite(dpi) ? Math.floor(dpi) : defaultPdfPrintProfile.dpi)),
    quality: pick(profile.quality, ["draft", "normal", "high"], defaultPdfPrintProfile.quality),
    compatibilityMode: profile.compatibilityMode !== false
  };
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function normalizePaperSize(value: unknown): string {
  const normalized = String(value || defaultPdfPrintProfile.paperSize).trim().toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9_-]{1,24}$/.test(normalized) ? normalized : defaultPdfPrintProfile.paperSize;
}
