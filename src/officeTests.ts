import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { rootDir } from "./paths.js";
import type { AppConfig } from "./types.js";
import { assertPrinterAvailable } from "./printerCompatibility.js";
import { getPowerShellPath } from "./powershell.js";

const execFileAsync = promisify(execFile);

export async function runOfficePrintTest(type: "excel" | "powerpoint", config: AppConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.printerName.trim()) {
    throw new Error("No printer selected");
  }

  await assertPrinterAvailable(config.printerName);
  await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "test-office-print.ps1"),
    "-Type",
    type,
    "-PrinterName",
    config.printerName,
    "-Copies",
    String(config.copies || 1),
    "-PaperSize",
    config.officePrintProfile?.paperSize || "A4",
    "-ExcelOrientation",
    config.officePrintProfile?.excelOrientation || "landscape",
    "-PowerPointOrientation",
    config.officePrintProfile?.powerPointOrientation || "landscape",
    "-FitToWidth",
    String(config.officePrintProfile?.fitToWidth !== false)
  ]);

  return { ok: true, message: `${type} test print was sent to ${config.printerName}.` };
}
