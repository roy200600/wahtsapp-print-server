import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  PrinterManager,
  type PrinterCompatibilityCheck,
  type PrinterCompatibilityInfo
} from "./printerCompatibility.js";
import { getPowerShellPath } from "./powershell.js";

const execFileAsync = promisify(execFile);

export async function listWindowsPrinters(): Promise<string[]> {
  const { stdout } = await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-Command",
    "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $OutputEncoding=[System.Text.Encoding]::UTF8; try { Get-Printer -ErrorAction Stop | Select-Object -ExpandProperty Name | ConvertTo-Json } catch { try { Get-CimInstance Win32_Printer -ErrorAction Stop | Select-Object -ExpandProperty Name | ConvertTo-Json } catch { Add-Type -AssemblyName System.Drawing -ErrorAction Stop; [System.Drawing.Printing.PrinterSettings]::InstalledPrinters | ConvertTo-Json } }"
  ], { encoding: "utf8" });

  const parsed = JSON.parse(stdout.trim() || "[]");
  return (Array.isArray(parsed) ? parsed : [parsed]).map((name) => String(name).trim()).filter(Boolean);
}

export async function listWindowsPrinterDetails(): Promise<PrinterCompatibilityInfo[]> {
  return PrinterManager.listPrinters();
}

export async function checkWindowsPrinterCompatibility(printerName: string): Promise<PrinterCompatibilityCheck> {
  return PrinterManager.checkPrinter(printerName);
}
