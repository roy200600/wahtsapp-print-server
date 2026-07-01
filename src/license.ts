import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { appPaths } from "./paths.js";

const trialDays = 14;
const licensePath = path.join(appPaths.configDir, "license.json");
const licenseStatePath = path.join(appPaths.configDir, "license-state.json");
const publicKeyPem = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEA8/BEXH9df1ss86ln9vDybVP6KLRV83uxv6+8oQvWjDg=
-----END PUBLIC KEY-----`;

export interface LicensePayload {
  version: 1;
  licenseId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  machineId: string;
  issuedAt: string;
  expiresAt: string;
  features: string[];
}

export interface LicenseFile {
  payload: LicensePayload;
  signature: string;
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

  const license = readLicense();
  if (license) {
    const result = validateLicense(license, machineId);
    if (result.valid) {
      return {
        mode: "licensed",
        valid: true,
        canRun: true,
        machineId,
        machineCode,
        trialStartedAt: state.trialStartedAt,
        trialEndsAt,
        trialDaysTotal: trialDays,
        trialDaysLeft,
        customerName: license.payload.customerName,
        licenseId: license.payload.licenseId,
        expiresAt: license.payload.expiresAt,
        features: license.payload.features
      };
    }

    return {
      mode: "invalid",
      valid: false,
      canRun: trialDaysLeft > 0,
      machineId,
      machineCode,
      trialStartedAt: state.trialStartedAt,
      trialEndsAt,
      trialDaysTotal: trialDays,
      trialDaysLeft,
      features: [],
      reason: result.reason
    };
  }

  if (trialDaysLeft > 0) {
    return {
      mode: "trial",
      valid: true,
      canRun: true,
      machineId,
      machineCode,
      trialStartedAt: state.trialStartedAt,
      trialEndsAt,
      trialDaysTotal: trialDays,
      trialDaysLeft,
      features: ["trial"]
    };
  }

  return {
    mode: "expired",
    valid: false,
    canRun: false,
    machineId,
    machineCode,
    trialStartedAt: state.trialStartedAt,
    trialEndsAt,
    trialDaysTotal: trialDays,
    trialDaysLeft: 0,
    features: [],
    reason: "תקופת הניסיון הסתיימה. נדרש רישיון להפעלת המערכת."
  };
}

export function assertLicenseCanRun(): void {
  const status = getLicenseStatus();
  if (!status.canRun) {
    throw new Error(status.reason || "נדרש רישיון תקף להפעלת המערכת.");
  }
}

export function activateLicense(input: unknown): LicenseStatus {
  const license = parseLicenseInput(input);
  const result = validateLicense(license, getMachineId());
  if (!result.valid) {
    throw new Error(result.reason || "הרישיון אינו תקף.");
  }

  fs.mkdirSync(appPaths.configDir, { recursive: true });
  fs.writeFileSync(licensePath, JSON.stringify(license, null, 2), "utf8");
  return getLicenseStatus();
}

function parseLicenseInput(input: unknown): LicenseFile {
  if (typeof input === "string") {
    return JSON.parse(input) as LicenseFile;
  }
  if (typeof input === "object" && input) {
    return input as LicenseFile;
  }
  throw new Error("יש להזין קובץ רישיון או תוכן רישיון תקין.");
}

function validateLicense(license: LicenseFile, machineId: string): { valid: boolean; reason?: string } {
  if (!license?.payload || !license.signature) {
    return { valid: false, reason: "מבנה הרישיון אינו תקין." };
  }

  if (license.payload.version !== 1) {
    return { valid: false, reason: "גרסת הרישיון אינה נתמכת." };
  }

  if (license.payload.machineId !== machineId) {
    return { valid: false, reason: "הרישיון שייך למחשב אחר." };
  }

  if (Date.now() > Date.parse(license.payload.expiresAt)) {
    return { valid: false, reason: "תוקף הרישיון הסתיים." };
  }

  const validSignature = crypto.verify(
    null,
    Buffer.from(canonicalJson(license.payload), "utf8"),
    publicKeyPem,
    Buffer.from(license.signature, "base64url")
  );

  return validSignature ? { valid: true } : { valid: false, reason: "חתימת הרישיון אינה תקינה." };
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
