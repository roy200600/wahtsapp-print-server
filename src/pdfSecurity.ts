import fs from "node:fs";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export function isPasswordProtectedPdf(filePath: string): boolean {
  const stat = fs.statSync(filePath);
  const size = stat.size;
  const chunkSize = Math.min(1024 * 1024, size);
  const chunks: Buffer[] = [];
  const fd = fs.openSync(filePath, "r");

  try {
    const first = Buffer.alloc(chunkSize);
    fs.readSync(fd, first, 0, chunkSize, 0);
    chunks.push(first);

    if (size > chunkSize) {
      const tailSize = Math.min(2 * 1024 * 1024, size);
      const tail = Buffer.alloc(tailSize);
      fs.readSync(fd, tail, 0, tailSize, Math.max(0, size - tailSize));
      chunks.push(tail);
    }
  } finally {
    fs.closeSync(fd);
  }

  return /\/Encrypt\b/.test(Buffer.concat(chunks).toString("latin1"));
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

function cleanPassword(value: string): string {
  return value.trim().replace(/^["'“”‘’]+|["'“”‘’.,;:!?]+$/g, "");
}
