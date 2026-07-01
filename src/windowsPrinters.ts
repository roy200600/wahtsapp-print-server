import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  PrinterManager,
  type PrinterCompatibilityCheck,
  type PrinterCompatibilityInfo
} from "./printerCompatibility.js";

const execFileAsync = promisify(execFile);

export async function listWindowsPrinters(): Promise<string[]> {
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $OutputEncoding=[System.Text.Encoding]::UTF8; Get-Printer | Select-Object -ExpandProperty Name | ConvertTo-Json"
  ], { encoding: "utf8" });

  const parsed = JSON.parse(stdout || "[]");
  return (Array.isArray(parsed) ? parsed : [parsed]).map((name) => String(name).trim()).filter(Boolean);
}

export async function listWindowsPrinterDetails(): Promise<PrinterCompatibilityInfo[]> {
  return PrinterManager.listPrinters();
}

export async function checkWindowsPrinterCompatibility(printerName: string): Promise<PrinterCompatibilityCheck> {
  return PrinterManager.checkPrinter(printerName);
}
