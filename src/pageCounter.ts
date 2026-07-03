import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { IncomingAttachment } from "./types.js";
import { rootDir } from "./paths.js";
import { getPdfPageCount } from "./pdfSecurity.js";

const execFileAsync = promisify(execFile);

export async function countAttachmentPages(attachment: IncomingAttachment): Promise<number> {
  const extension = attachment.extension.toLowerCase();
  if (["jpg", "jpeg", "png"].includes(extension)) {
    return 1;
  }

  if (extension === "pdf") {
    return countPdfPages(attachment.filePath, attachment.pdfPassword);
  }

  if (["doc", "docx", "rtf", "ppt", "pptx", "xls", "xlsx", "csv"].includes(extension)) {
    return countOfficePages(attachment.filePath, extension);
  }

  if (extension === "txt") {
    return countTextPages(attachment.filePath);
  }

  return 1;
}

async function countPdfPages(filePath: string, password?: string): Promise<number> {
  try {
    return await getPdfPageCount(filePath, password);
  } catch {
    const content = fs.readFileSync(filePath, "latin1");
    const matches = content.match(/\/Type\s*\/Page\b/g);
    return Math.max(1, matches?.length ?? 1);
  }
}

async function countOfficePages(filePath: string, extension: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        path.join(rootDir, "scripts", "count-pages.ps1"),
        "-FilePath",
        path.resolve(filePath),
        "-Extension",
        extension
      ],
      { timeout: 60000 }
    );
    const count = Number(stdout.trim());
    return Number.isFinite(count) && count > 0 ? count : 1;
  } catch {
    return 1;
  }
}

function countTextPages(filePath: string): number {
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).length;
  return Math.max(1, Math.ceil(lines / 60));
}
