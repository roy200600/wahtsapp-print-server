import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { rootDir } from "./paths.js";
import type { AppConfig, IncomingAttachment } from "./types.js";
import { assertPrinterAvailable } from "./printerCompatibility.js";
import { getPowerShellPath } from "./powershell.js";

const execFileAsync = promisify(execFile);

export async function printFile(attachment: IncomingAttachment, config: AppConfig): Promise<void> {
  if (!config.printerName.trim()) {
    throw new Error("No printer selected");
  }

  await assertPrinterAvailable(config.printerName);

  const extension = attachment.extension.toLowerCase();
  if (extension === "pdf") {
    await printPdfWithSumatra(attachment, config);
    return;
  }

  if (["jpg", "jpeg", "png"].includes(extension)) {
    await printImageWithDriver(attachment.filePath, config);
    return;
  }

  if (["txt"].includes(extension)) {
    await printTextWithDriver(attachment.filePath, config);
    return;
  }

  if (["doc", "docx", "rtf"].includes(extension)) {
    await printWordWithDriver(attachment.filePath, config);
    return;
  }

  if (["xls", "xlsx", "csv"].includes(extension)) {
    await printExcelWithDriver(attachment.filePath, config);
    return;
  }

  if (["ppt", "pptx"].includes(extension)) {
    await printPowerPointWithDriver(attachment.filePath, config);
    return;
  }

  await printWithWindowsShell(attachment.filePath);
}

async function printPdfWithSumatra(attachment: IncomingAttachment, config: AppConfig): Promise<void> {
  const profile = config.pdfPrintProfile;
  await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "print-pdf-profile.ps1"),
    "-FilePath",
    attachment.filePath,
    "-PrinterName",
    config.printerName,
    "-SumatraPath",
    config.sumatraPdfPath,
    "-ColorMode",
    profile.colorMode,
    "-DuplexMode",
    profile.duplex,
    "-Orientation",
    profile.orientation,
    "-PaperSize",
    profile.paperSize,
    "-Scaling",
    profile.scaling,
    "-ScalePercent",
    String(profile.scalePercent),
    "-PdfPassword",
    attachment.pdfPassword ?? "",
    "-Copies",
    String(profile.copies),
    "-Dpi",
    String(profile.dpi),
    "-Quality",
    profile.quality,
    "-CompatibilityMode",
    String(profile.compatibilityMode)
  ]);
}

async function printImageWithDriver(filePath: string, config: AppConfig): Promise<void> {
  const profile = config.pdfPrintProfile;
  await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "print-image.ps1"),
    "-FilePath",
    filePath,
    "-PrinterName",
    config.printerName,
    "-Orientation",
    profile.orientation,
    "-PaperSize",
    profile.paperSize,
    "-ScalePercent",
    String(profile.scalePercent),
    "-Copies",
    String(config.copies)
  ]);
}

async function printTextWithDriver(filePath: string, config: AppConfig): Promise<void> {
  await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "print-text.ps1"),
    "-FilePath",
    filePath,
    "-PrinterName",
    config.printerName,
    "-Copies",
    String(config.copies)
  ]);
}

async function printWordWithDriver(filePath: string, config: AppConfig): Promise<void> {
  await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "print-word.ps1"),
    "-FilePath",
    filePath,
    "-PrinterName",
    config.printerName,
    "-Copies",
    String(config.copies)
  ]);
}

async function printExcelWithDriver(filePath: string, config: AppConfig): Promise<void> {
  await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "print-excel.ps1"),
    "-FilePath",
    filePath,
    "-PrinterName",
    config.printerName,
    "-Copies",
    String(config.copies)
  ]);
}

async function printPowerPointWithDriver(filePath: string, config: AppConfig): Promise<void> {
  const profile = config.pdfPrintProfile;
  await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    path.join(rootDir, "scripts", "print-powerpoint.ps1"),
    "-FilePath",
    filePath,
    "-PrinterName",
    config.printerName,
    "-SumatraPath",
    config.sumatraPdfPath,
    "-ColorMode",
    profile.colorMode,
    "-DuplexMode",
    profile.duplex,
    "-PaperSize",
    profile.paperSize,
    "-Scaling",
    profile.scaling,
    "-ScalePercent",
    String(profile.scalePercent),
    "-Copies",
    String(config.copies),
    "-Dpi",
    String(profile.dpi),
    "-Quality",
    profile.quality,
    "-CompatibilityMode",
    String(profile.compatibilityMode)
  ]);
}

async function printWithWindowsShell(filePath: string): Promise<void> {
  await execFileAsync(getPowerShellPath(), [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    `Start-Process -FilePath ${JSON.stringify(filePath)} -Verb Print -WindowStyle Hidden`
  ]);
}
