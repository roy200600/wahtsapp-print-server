import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { appPaths } from "./paths.js";
import { defaultConfig, defaultCustomerMarketing, defaultCustomerMessages, defaultPdfPrintProfile } from "./config.js";
import type { AppConfig, PrinterProfileConfig } from "./types.js";

const trialDays = 14;
const trialDocumentLimit = 5;
const trialSenderLimit = 5;
const licensePath = path.join(appPaths.configDir, "license.json");
const licenseStatePath = path.join(appPaths.configDir, "license-state.json");
const trialUsagePath = path.join(appPaths.configDir, "trial-usage.json");
const registrationPath = path.join(appPaths.configDir, "registration.json");
const superAdminPasswordHash = "4ebba2f9c4d9a82128aa53b27f24c60dde9229c9a7cf6920b5aef2064794d1ae";
const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA8/BEXH9df1ss86ln9vDybVP6KLRV83uxv6+8oQvWjDg=
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  version: 1;
  licenseId: string;
  customerName: string;
  businessName?: string;
  contactName?: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress?: string;
  planId?: string;
  planLabel?: string;
  machineId: string;
  issuedAt: string;
  expiresAt: string;
  features: string[];
}

export interface LicenseFile {
  payload: LicensePayload;
  signature: string;
}

export interface TrialLimits {
  documentsPerDay: number;
  sendersPerDay: number;
  printerCount: number;
  fileTypes: string[];
}

export interface TrialUsage {
  date: string;
  documentCount: number;
  senders: string[];
  senderCount: number;
}

export interface CustomerRegistration {
  businessName: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  plan: "monthly" | "sixMonths" | "yearly" | "";
  updatedAt: string;
}

export interface LicenseStatus {
  mode: "trial" | "licensed" | "expired" | "invalid";
  valid: boolean;
  canRun: boolean;
  machineId: string;
  machineCode: string;
  trialStartedAt: string;
  trialEndsAt: string;
  trialDaysTotal: number;
  trialDaysLeft: number;
  customerName?: string;
  licenseId?: string;
  expiresAt?: string;
  features: string[];
  trialLimits: TrialLimits;
  trialUsage: TrialUsage;
  reason?: string;
}

interface LicenseState {
  trialStartedAt: string;
}

export function getLicenseStatus(): LicenseStatus {
  fs.mkdirSync(appPaths.configDir, { recursive: true });
  const machineId = getMachineId();
  const machineCode = formatMachineCode(machineId);
  const state = getLicenseState();
  const trialEndsAt = addDays(state.trialStartedAt, trialDays);
  const trialDaysLeft = daysLeft(trialEndsAt);
  const trialLimits = getTrialLimits();
  const trialUsage = getTrialUsage();

  const base = {
    machineId,
    machineCode,
    trialStartedAt: state.trialStartedAt,
    trialEndsAt,
    trialDaysTotal: trialDays,
    trialDaysLeft,
    trialLimits,
    trialUsage
  };

  const license = readLicense();
  if (license) {
    const result = validateLicense(license, machineId);
    if (result.valid) {
      return {
        ...base,
        mode: "licensed",
        valid: true,
        canRun: true,
        customerName: license.payload.customerName,
        licenseId: license.payload.licenseId,
        expiresAt: license.payload.expiresAt,
        features: license.payload.features
      };
    }

    return {
      ...base,
      mode: "invalid",
      valid: false,
      canRun: false,
      features: [],
      reason: result.reason
    };
  }

  if (trialDaysLeft > 0) {
    return {
      ...base,
      mode: "trial",
      valid: true,
      canRun: true,
      features: ["trial"]
    };
  }

  return {
    ...base,
    mode: "expired",
    valid: false,
    canRun: false,
    trialDaysLeft: 0,
    features: [],
    reason: "Trial ended. A valid license is required to use the system."
  };
}

export function assertLicenseCanRun(): void {
  const status = getLicenseStatus();
  if (!status.canRun) {
    throw new Error(status.reason || "A valid license is required to use the system.");
  }
}

export function activateLicense(input: unknown): LicenseStatus {
  const license = parseLicenseInput(input);
  const result = validateLicense(license, getMachineId());
  if (!result.valid) {
    throw new Error(result.reason || "License is not valid.");
  }

  fs.mkdirSync(appPaths.configDir, { recursive: true });
  fs.writeFileSync(licensePath, JSON.stringify(license, null, 2), "utf8");
  return getLicenseStatus();
}

export function getRegistration(): CustomerRegistration {
  try {
    if (!fs.existsSync(registrationPath)) return emptyRegistration();
    const parsed = JSON.parse(fs.readFileSync(registrationPath, "utf8").replace(/^\uFEFF/, "")) as Partial<CustomerRegistration>;
    return normalizeRegistration(parsed);
  } catch {
    return emptyRegistration();
  }
}

export function saveRegistration(input: Partial<CustomerRegistration>): CustomerRegistration {
  const normalized = normalizeRegistration(input);
  fs.mkdirSync(appPaths.configDir, { recursive: true });
  fs.writeFileSync(registrationPath, JSON.stringify(normalized, null, 2), "utf8");
  return normalized;
}

export function verifySuperAdminPassword(password: string): boolean {
  const hash = crypto.createHash("sha256").update(password, "utf8").digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(superAdminPasswordHash));
}

export function applyLicenseLimits(config: AppConfig, status = getLicenseStatus()): AppConfig {
  const normalizedLanguage = config.language === "en" ? "en" : "he";
  if (status.mode === "licensed") {
    return {
      ...config,
      language: normalizedLanguage,
      customerMessages: {
        ...config.customerMessages,
        promo: defaultCustomerMessages.promo
      }
    };
  }

  const firstPrinter = normalizeTrialPrinterProfile(config);
  const printerName = firstPrinter?.printerName || config.printerName || "";
  const pdfPrintProfile = {
    ...defaultPdfPrintProfile,
    ...(firstPrinter?.printProfile ?? config.pdfPrintProfile),
    colorMode: "grayscale" as const,
    duplex: "simplex" as const,
    copies: 1
  };

  return {
    ...config,
    language: normalizedLanguage,
    printerName,
    allowedNumbers: [],
    allowedGroups: [],
    allowedFileTypes: [...status.trialLimits.fileTypes],
    autoPrint: status.canRun,
    sendWhatsappReply: true,
    allowGroupPrinting: false,
    copies: 1,
    duplex: false,
    color: false,
    pdfPrintProfile,
    officePrintProfile: firstPrinter?.officeProfile ?? config.officePrintProfile,
    printerRoles: {
      defaultPrinter: printerName,
      blackWhitePrinter: printerName,
      colorPrinter: "",
      askColorPreference: false
    },
    printerProfiles: firstPrinter
      ? [{
          ...firstPrinter,
          printerName,
          isPrimary: true,
          role: "blackWhite",
          askCustomerColor: false,
          printProfile: pdfPrintProfile
        }]
      : [],
    pricing: {
      ...config.pricing,
      enabled: false
    },
    email: defaultConfig.email,
    branding: defaultConfig.branding,
    customerMessages: defaultCustomerMessages,
    customerMarketing: defaultCustomerMarketing,
    alertsEnabled: status.canRun ? Boolean(config.alertsEnabled) : false
  };
}

export function mergeConfigForLicense(existing: AppConfig, incoming: AppConfig, status = getLicenseStatus()): AppConfig {
  if (status.mode === "licensed") {
    return {
      ...incoming,
      language: incoming.language === "en" ? "en" : "he",
      customerMessages: {
        ...incoming.customerMessages,
        promo: defaultCustomerMessages.promo
      }
    };
  }

  const limited = applyLicenseLimits({ ...existing, ...incoming }, status);
  return {
    ...existing,
    language: limited.language,
    adminPassword: incoming.adminPassword || existing.adminPassword,
    printerName: limited.printerName,
    printerProfiles: limited.printerProfiles,
    printerRoles: limited.printerRoles,
    pdfPrintProfile: limited.pdfPrintProfile,
    officePrintProfile: limited.officePrintProfile,
    sumatraPdfPath: incoming.sumatraPdfPath || existing.sumatraPdfPath,
    maxFileSizeMB: Number(incoming.maxFileSizeMB) || existing.maxFileSizeMB,
    autoPrint: true,
    deleteAfterPrint: Boolean(incoming.deleteAfterPrint),
    sendWhatsappReply: true,
    allowGroupPrinting: false,
    allowedNumbers: [],
    allowedGroups: [],
    allowedFileTypes: [...status.trialLimits.fileTypes],
    copies: 1,
    duplex: false,
    color: false,
    alertsEnabled: Boolean(incoming.alertsEnabled),
    alertsPhone: incoming.alertsPhone || existing.alertsPhone,
    pricing: { ...existing.pricing, enabled: false },
    email: existing.email,
    branding: existing.branding,
    customerMessages: defaultCustomerMessages,
    customerMarketing: defaultCustomerMarketing,
    port: existing.port
  };
}

export function registerTrialDocument(senderPhone: string): { ok: true; usage: TrialUsage } | { ok: false; reason: string; usage: TrialUsage } {
  const status = getLicenseStatus();
  if (status.mode === "licensed") {
    return { ok: true, usage: status.trialUsage };
  }
  if (!status.canRun) {
    return { ok: false, reason: status.reason || "A valid license is required.", usage: status.trialUsage };
  }

  const usage = getTrialUsage();
  const phone = String(senderPhone || "").trim();
  const senders = phone && !usage.senders.includes(phone) ? [...usage.senders, phone] : usage.senders;
  if (usage.documentCount + 1 > trialDocumentLimit) {
    return { ok: false, reason: "Trial limit reached: 5 documents per day.", usage };
  }
  if (senders.length > trialSenderLimit) {
    return { ok: false, reason: "Trial limit reached: 5 senders per day.", usage };
  }

  const nextUsage: TrialUsage = {
    date: todayKey(),
    documentCount: usage.documentCount + 1,
    senders,
    senderCount: senders.length
  };
  fs.mkdirSync(appPaths.configDir, { recursive: true });
  fs.writeFileSync(trialUsagePath, JSON.stringify(nextUsage, null, 2), "utf8");
  return { ok: true, usage: nextUsage };
}

export function getTrialLimits(): TrialLimits {
  return {
    documentsPerDay: trialDocumentLimit,
    sendersPerDay: trialSenderLimit,
    printerCount: 1,
    fileTypes: ["pdf", "jpg", "jpeg", "png"]
  };
}

export function getTrialUsage(): TrialUsage {
  const fallback: TrialUsage = {
    date: todayKey(),
    documentCount: 0,
    senders: [],
    senderCount: 0
  };
  try {
    if (!fs.existsSync(trialUsagePath)) return fallback;
    const parsed = JSON.parse(fs.readFileSync(trialUsagePath, "utf8").replace(/^\uFEFF/, "")) as Partial<TrialUsage>;
    if (parsed.date !== fallback.date) return fallback;
    const senders = Array.isArray(parsed.senders) ? parsed.senders.map(String).filter(Boolean) : [];
    return {
      date: fallback.date,
      documentCount: Math.max(0, Number(parsed.documentCount) || 0),
      senders,
      senderCount: senders.length
    };
  } catch {
    return fallback;
  }
}

function parseLicenseInput(input: unknown): LicenseFile {
  if (typeof input === "string") {
    return JSON.parse(input) as LicenseFile;
  }
  if (typeof input === "object" && input) {
    return input as LicenseFile;
  }
  throw new Error("License input must be a JSON object or JSON text.");
}

function validateLicense(license: LicenseFile, machineId: string): { valid: boolean; reason?: string } {
  if (!license?.payload || !license.signature) {
    return { valid: false, reason: "License file structure is invalid." };
  }

  if (license.payload.version !== 1) {
    return { valid: false, reason: "License version is not supported." };
  }

  if (license.payload.machineId !== machineId) {
    return { valid: false, reason: "License belongs to another computer." };
  }

  if (Date.now() > Date.parse(license.payload.expiresAt)) {
    return { valid: false, reason: "License expired." };
  }

  const validSignature = crypto.verify(
    null,
    Buffer.from(canonicalJson(license.payload), "utf8"),
    publicKeyPem,
    Buffer.from(license.signature, "base64url")
  );

  return validSignature ? { valid: true } : { valid: false, reason: "License signature is invalid." };
}

function readLicense(): LicenseFile | undefined {
  try {
    if (!fs.existsSync(licensePath)) return undefined;
    return JSON.parse(fs.readFileSync(licensePath, "utf8").replace(/^\uFEFF/, "")) as LicenseFile;
  } catch {
    return undefined;
  }
}

function getLicenseState(): LicenseState {
  if (fs.existsSync(licenseStatePath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(licenseStatePath, "utf8").replace(/^\uFEFF/, "")) as Partial<LicenseState>;
      if (parsed.trialStartedAt && !Number.isNaN(Date.parse(parsed.trialStartedAt))) {
        return { trialStartedAt: parsed.trialStartedAt };
      }
    } catch {
      // A corrupt state file is replaced below.
    }
  }

  const state = { trialStartedAt: new Date().toISOString() };
  fs.mkdirSync(appPaths.configDir, { recursive: true });
  fs.writeFileSync(licenseStatePath, JSON.stringify(state, null, 2), "utf8");
  return state;
}

function normalizeTrialPrinterProfile(config: AppConfig): PrinterProfileConfig | undefined {
  const profiles = Array.isArray(config.printerProfiles) ? config.printerProfiles : [];
  const first = profiles.find((profile) => profile.isPrimary) || profiles[0];
  if (first) {
    return {
      ...first,
      printerName: first.printerName || config.printerName || "",
      displayName: first.displayName || "מדפסת Trial",
      isPrimary: true
    };
  }
  if (!config.printerName) {
    return undefined;
  }
  return {
    id: "trial-printer",
    displayName: "מדפסת Trial",
    printerName: config.printerName,
    role: "blackWhite",
    isPrimary: true,
    askCustomerColor: false,
    printProfile: {
      ...config.pdfPrintProfile,
      colorMode: "grayscale",
      duplex: "simplex",
      copies: 1
    },
    officeProfile: config.officePrintProfile
  };
}

function emptyRegistration(): CustomerRegistration {
  return {
    businessName: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
    plan: "",
    updatedAt: ""
  };
}

function normalizeRegistration(input: Partial<CustomerRegistration>): CustomerRegistration {
  const plan = ["monthly", "sixMonths", "yearly"].includes(String(input.plan)) ? input.plan : "";
  return {
    businessName: String(input.businessName || "").trim(),
    contactName: String(input.contactName || "").trim(),
    phone: String(input.phone || "").replace(/[^\d]/g, ""),
    email: String(input.email || "").trim(),
    address: String(input.address || "").trim(),
    plan: plan as CustomerRegistration["plan"],
    updatedAt: new Date().toISOString()
  };
}

function getMachineId(): string {
  const parts = [os.hostname(), os.platform(), os.arch()];
  const machineGuid = readWindowsMachineGuid();
  if (machineGuid) parts.push(machineGuid);
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32).toUpperCase();
}

function readWindowsMachineGuid(): string {
  if (process.platform !== "win32") return "";
  try {
    const output = execFileSync("reg.exe", [
      "query",
      "HKLM\\SOFTWARE\\Microsoft\\Cryptography",
      "/v",
      "MachineGuid"
    ], { encoding: "utf8" });
    const match = output.match(/MachineGuid\s+REG_SZ\s+([^\r\n]+)/i);
    return match?.[1]?.trim() ?? "";
  } catch {
    return "";
  }
}

function formatMachineCode(machineId: string): string {
  return `MYPC-WPS-${machineId.match(/.{1,4}/g)?.join("-") ?? machineId}`;
}

function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(isoDate) + days * 24 * 60 * 60 * 1000).toISOString();
}

function daysLeft(isoDate: string): number {
  const diff = Date.parse(isoDate) - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
