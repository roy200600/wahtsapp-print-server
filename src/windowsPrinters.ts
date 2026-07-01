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
    "Get-Printer | Select-Object -ExpandProperty Name"
  ]);

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function listWindowsPrinterDetails(): Promise<PrinterCompatibilityInfo[]> {
  return PrinterManager.listPrinters();
}

export async function checkWindowsPrinterCompatibility(printerName: string): Promise<PrinterCompatibilityCheck> {
  return PrinterManager.checkPrinter(printerName);
}
