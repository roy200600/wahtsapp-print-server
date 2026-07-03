import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export function isPasswordProtectedPdf(filePath: string): boolean {
  const chunkSize = 1024 * 1024;
  const needle = Buffer.from("/Encrypt", "latin1");
  let carry = Buffer.alloc(0);
  const fd = fs.openSync(filePath, "r");

  try {
    const buffer = Buffer.alloc(chunkSize);

    while (true) {
      const bytesRead = fs.readSync(fd, buffer, 0, chunkSize, null);
      if (bytesRead <= 0) {
        return false;
      }

      const current = bytesRead === buffer.length ? buffer : buffer.subarray(0, bytesRead);
      const searchable = carry.length ? Buffer.concat([carry, current]) : current;
      if (searchable.indexOf(needle) !== -1) {
        return true;
      }

      const carryLength = Math.min(needle.length - 1, searchable.length);
      carry = Buffer.from(searchable.subarray(searchable.length - carryLength));
    }
  } finally {
    fs.closeSync(fd);
  }
}

export function extractPdfPassword(text: string | undefined, allowBareText = false): string | undefined {
  const normalized = String(text ?? "").trim();
  if (!normalized) return undefined;

  const patterns = [
    /(?:סיסמה|סיסמא|הסיסמה|הסיסמא|password|pass|pwd)\s*(?:היא|is)?\s*[:=\-]?\s*([^\s]{1,128})/i,
    /(?:סיסמה|סיסמא|סיסמת\s*הקובץ|password|pass|pwd)\s*[:=\-]?\s*([^\s]{1,128})/i,
    /(?:הסיסמה|הסיסמא)\s+([^\s]{1,128})/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match?.[1]) {
      return cleanPassword(match[1]);
    }
  }

  if (allowBareText && /^\S{1,128}$/.test(normalized)) {
    return cleanPassword(normalized);
  }

  return undefined;
}

export async function verifyPdfPassword(
  filePath: string,
  password: string,
  _sumatraPath: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const normalizedPassword = String(password || "");
  if (!normalizedPassword) {
    return { ok: false, reason: "PDF password is missing or incorrect." };
  }

  const loadingTask = getDocument({
    data: new Uint8Array(fs.readFileSync(filePath)),
    password: normalizedPassword
  });
  try {
    const pdf = await loadingTask.promise;
    await pdf.getPage(1);
    return { ok: true };
  } catch {
    return { ok: false, reason: "PDF password is missing or incorrect." };
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

export async function getPdfPageCount(filePath: string, password?: string): Promise<number> {
  const options: { data: Uint8Array; password?: string } = {
    data: new Uint8Array(fs.readFileSync(filePath))
  };

  if (password) {
    options.password = String(password);
  }

  const loadingTask = getDocument(options);
  try {
    const pdf = await loadingTask.promise;
    return Math.max(1, Number(pdf.numPages) || 1);
  } finally {
    await loadingTask.destroy().catch(() => undefined);
  }
}

function cleanPassword(value: string): string {
  return value.trim().replace(/^["'“”‘’]+|["'“”‘’.,;:!?]+$/g, "");
}
