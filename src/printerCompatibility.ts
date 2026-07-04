import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getPowerShellPath } from "./powershell.js";

const execFileAsync = promisify(execFile);

export type CapabilityValue = "yes" | "no" | "unknown";

export interface PrinterCompatibilityInfo {
  name: string;
  driverName: string;
  manufacturer: string;
  status: string;
  printerStatus: string;
  connectionType: string;
  isDefault: boolean;
  isShared: boolean;
  isNetwork: boolean;
  isVirtual: boolean;
  portName: string;
  location: string;
  comment: string;
  queueCount: number;
  queueErrors: number;
  driverValid: boolean;
  capabilities: {
    color: CapabilityValue;
    duplex: CapabilityValue;
    paperSizes: string[];
  };
  compatibilityNote: string;
  available: boolean;
}

export interface PrinterCompatibilityCheck {
  ok: boolean;
  message: string;
  printer?: PrinterCompatibilityInfo;
  issues: string[];
  warnings?: string[];
}

export class PrinterManager {
  static async listPrinters(): Promise<PrinterCompatibilityInfo[]> {
    return new PrinterDetector().detect();
  }

  static async getPrinter(name: string): Promise<PrinterCompatibilityInfo | undefined> {
    const printers = await this.listPrinters();
    return printers.find((printer) => printer.name.toLowerCase() === name.toLowerCase());
  }

  static async checkPrinter(name: string): Promise<PrinterCompatibilityCheck> {
    return new PrinterStatusChecker().check(name);
  }
}

export class PrinterDetector {
  async detect(): Promise<PrinterCompatibilityInfo[]> {
    const raw = await runPrinterProbe();
    return raw.map((printer) => PrinterCompatibilityLayer.normalize(printer));
  }
}

export class PrinterStatusChecker {
  async check(name: string): Promise<PrinterCompatibilityCheck> {
    if (!name.trim()) {
      return { ok: false, message: "לא נבחרה מדפסת.", issues: ["missing-printer-name"] };
    }

    const printer = await PrinterManager.getPrinter(name);
    if (!printer) {
      return {
        ok: false,
        message: "המדפסת שנבחרה לא קיימת יותר ב-Windows. יש לבחור מדפסת מחדש.",
        issues: ["printer-not-found"]
      };
    }

    const issues: string[] = [];
    const warnings: string[] = [];
    if (!printer.driverValid) issues.push("printer-driver-invalid");
    if (hasBlockingPrinterStatus(printer.status, printer.printerStatus)) issues.push("printer-not-available");
    if (printer.queueErrors > 0) warnings.push("queue-has-errors");

    return {
      ok: issues.length === 0,
      message:
        issues.length === 0 && warnings.length === 0
          ? "המדפסת זמינה ומוכנה לקבלת עבודות הדפסה."
          : issues.length === 0
            ? "המדפסת נמצאה. קיימת אזהרה בתור ההדפסה, אך המערכת תנסה לשלוח אליה הדפסה."
          : "המדפסת נמצאה, אבל קיימת בעיית זמינות או שגיאה בתור ההדפסה.",
      printer,
      issues: [...issues, ...warnings],
      warnings
    };
  }
}

export class PrinterCapabilities {
  static value(value: unknown): CapabilityValue {
    if (value === true) return "yes";
    if (value === false) return "no";
    return "unknown";
  }
}

export class PrinterCompatibilityLayer {
  static normalize(raw: Record<string, unknown>): PrinterCompatibilityInfo {
    const name = text(raw.Name);
    const driverName = text(raw.DriverName);
    const status = text(raw.Status) || "Unknown";
    const printerStatus = text(raw.PrinterStatus) || "Unknown";
    const portName = text(raw.PortName);
    const queueCount = number(raw.QueueCount);
    const queueErrors = number(raw.QueueErrors);
    const isNetwork = Boolean(raw.Network);
    const isShared = Boolean(raw.Shared);
    const driverValid = raw.DriverValid !== false;
    const isVirtual = detectVirtualPrinter(name, driverName, portName);
    const manufacturer = detectManufacturer(`${name} ${driverName}`);
    const connectionType = detectConnectionType(portName, isNetwork, isShared, isVirtual);
    const available = driverValid && isAvailable(status, printerStatus);
    const paperSizes = array(raw.PaperSizes);
    const capabilities = {
      color: PrinterCapabilities.value(raw.Color),
      duplex: PrinterCapabilities.value(raw.Duplex),
      paperSizes
    };

    return {
      name,
      driverName,
      manufacturer,
      status,
      printerStatus,
      connectionType,
      isDefault: Boolean(raw.Default),
      isShared,
      isNetwork,
      isVirtual,
      portName,
      location: text(raw.Location),
      comment: text(raw.Comment),
      queueCount,
      queueErrors,
      driverValid,
      capabilities,
      compatibilityNote: compatibilityNote(available, capabilities),
      available
    };
  }
}

export async function assertPrinterAvailable(printerName: string): Promise<void> {
  const result = await PrinterManager.checkPrinter(printerName);
  if (!result.ok) {
    throw new Error(result.message);
  }
}

async function runPrinterProbe(): Promise<Array<Record<string, unknown>>> {
  const script = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"
$cimPrinters = @()
$defaultPrinter = $null
try {
  $cimPrinters = @(Get-CimInstance Win32_Printer -ErrorAction Stop)
  $defaultPrinter = ($cimPrinters | Where-Object { $_.Default -eq $true } | Select-Object -First 1 -ExpandProperty Name)
} catch {}
try {
  $windowsPrinters = @(Get-Printer -ErrorAction Stop)
} catch {
  if ($cimPrinters.Count -gt 0) {
    $windowsPrinters = @($cimPrinters | ForEach-Object {
      [PSCustomObject]@{
        Name = $_.Name
        DriverName = $_.DriverName
        PrinterStatus = $_.PrinterStatus
        Shared = $_.Shared
        PortName = $_.PortName
        Location = $_.Location
        Comment = $_.Comment
      }
    })
  } else {
    Add-Type -AssemblyName System.Drawing -ErrorAction Stop
    $windowsPrinters = @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters | ForEach-Object {
      $settings = New-Object System.Drawing.Printing.PrinterSettings
      $settings.PrinterName = [string]$_
      if ($settings.IsDefaultPrinter) { $defaultPrinter = [string]$_ }
      [PSCustomObject]@{
        Name = [string]$_
        DriverName = ""
        PrinterStatus = "Unknown"
        Shared = $false
        PortName = ""
        Location = ""
        Comment = ""
      }
    })
  }
}
$printers = $windowsPrinters | ForEach-Object {
  $printer = $_
  $config = $null
  $jobs = @()
  $driverValid = $false
  try { $config = Get-PrintConfiguration -PrinterName $printer.Name -ErrorAction Stop } catch {}
  try { $jobs = @(Get-PrintJob -PrinterName $printer.Name -ErrorAction SilentlyContinue) } catch {}
  try {
    Add-Type -AssemblyName System.Drawing -ErrorAction SilentlyContinue
    $settings = New-Object System.Drawing.Printing.PrinterSettings
    $settings.PrinterName = $printer.Name
    $driverValid = [bool]$settings.IsValid
  } catch {}
  [PSCustomObject]@{
    Name = $printer.Name
    DriverName = $printer.DriverName
    Status = [string]$printer.PrinterStatus
    PrinterStatus = [string]$printer.PrinterStatus
    Default = ($printer.Name -eq $defaultPrinter)
    Shared = [bool]$printer.Shared
    Network = [bool]$printer.Shared
    PortName = $printer.PortName
    Location = $printer.Location
    Comment = $printer.Comment
    Color = if ($config) { $config.Color } else { $null }
    Duplex = if ($config) { $config.DuplexingMode -and $config.DuplexingMode.ToString() -ne "OneSided" } else { $null }
    PaperSizes = @()
    QueueCount = $jobs.Count
    QueueErrors = @($jobs | Where-Object { $_.JobStatus -match "Error|Offline|Paper|Blocked|UserIntervention" }).Count
    DriverValid = $driverValid
  }
}
$printers | ConvertTo-Json -Depth 5
`;
  const { stdout } = await execFileAsync(getPowerShellPath(), ["-NoProfile", "-Command", script], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 4
  });
  const parsed = JSON.parse(stdout.trim() || "[]");
  return Array.isArray(parsed) ? parsed : [parsed];
}

function detectManufacturer(value: string): string {
  const normalized = value.toLowerCase();
  const makers = [
    ["Fuji Xerox", ["fuji xerox"]],
    ["Xerox", ["xerox"]],
    ["HP", ["hewlett-packard", "hewlett packard", " hp ", "laserjet", "officejet", "deskjet"]],
    ["Brother", ["brother"]],
    ["Samsung", ["samsung"]],
    ["Canon", ["canon"]],
    ["Epson", ["epson"]],
    ["Lexmark", ["lexmark"]],
    ["Ricoh", ["ricoh"]],
    ["Kyocera", ["kyocera"]],
    ["Toshiba", ["toshiba"]],
    ["Sharp", ["sharp"]],
    ["Konica Minolta", ["konica", "minolta"]],
    ["OKI", ["oki"]],
    ["Pantum", ["pantum"]],
    ["Dell", ["dell"]],
    ["Zebra", ["zebra"]],
    ["Dymo", ["dymo"]],
    ["Citizen", ["citizen"]],
    ["Fujitsu", ["fujitsu"]],
    ["TSC", ["tsc"]],
    ["Bixolon", ["bixolon"]],
    ["Rollo", ["rollo"]],
    ["Argox", ["argox"]],
    ["Honeywell", ["honeywell"]],
    ["Intermec", ["intermec"]],
    ["SATO", ["sato"]],
    ["Star Micronics", ["star micronics", "star"]]
  ] as const;

  for (const [maker, needles] of makers) {
    if (needles.some((needle) => normalized.includes(needle.trim()))) return maker;
  }

  return "לא ידוע";
}

function detectConnectionType(portName: string, isNetwork: boolean, isShared: boolean, isVirtual: boolean): string {
  const port = portName.toLowerCase();
  if (isVirtual) return "Virtual/PDF";
  if (isShared) return "Shared Printer";
  if (
    isNetwork ||
    port.includes("tcp") ||
    port.includes("ip_") ||
    port.includes("wlan") ||
    port.includes("wsd") ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(portName)
  ) {
    return "Network/WiFi";
  }
  if (port.includes("usb")) return "USB";
  if (port.includes("lpt")) return "LPT";
  if (port.includes("com")) return "Serial";
  return portName ? "Windows Port" : "לא ידוע";
}

function detectVirtualPrinter(name: string, driverName: string, portName: string): boolean {
  return /pdf|xps|onenote|fax|document writer/i.test(`${name} ${driverName} ${portName}`);
}

function isAvailable(status: string, printerStatus: string): boolean {
  const value = `${status} ${printerStatus}`.toLowerCase();
  return !hasBlockingPrinterStatus(value, "");
}

function hasBlockingPrinterStatus(status: string, printerStatus: string): boolean {
  const value = `${status} ${printerStatus}`.toLowerCase();
  return /(offline|paper|jam|paused|blocked|intervention|not available|door open|out of toner|no toner)/i.test(value);
}

function compatibilityNote(available: boolean, capabilities: PrinterCompatibilityInfo["capabilities"]): string {
  if (!available) return "נמצאה מדפסת, אך היא אינה זמינה כרגע או שיש שגיאה בתור.";
  const unknowns = Object.values(capabilities).filter((value) => value === "unknown").length;
  return unknowns ? "המדפסת זמינה. חלק מהיכולות לא דווחו על ידי הדרייבר." : "המדפסת זמינה ותואמת דרך Windows Driver.";
}

function text(value: unknown): string {
  return String(value ?? "").trim();
}

function number(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function array(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item).trim()).filter(Boolean);
}
