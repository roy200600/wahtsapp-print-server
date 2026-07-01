import { fileTypeFromFile } from "file-type";
import type { AppConfig, IncomingAttachment } from "./types.js";

const blockedExtensions = new Set(["exe", "bat", "cmd", "js", "vbs", "ps1", "msi", "scr"]);
const allowedContainerMatches: Record<string, string[]> = {
  docx: ["zip"],
  xlsx: ["zip"],
  pptx: ["zip"]
};

export async function validateAttachment(
  attachment: IncomingAttachment,
  config: AppConfig
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const ext = attachment.extension.toLowerCase().replace(".", "");

  if (blockedExtensions.has(ext)) {
    return { ok: false, reason: "Blocked executable file type" };
  }

  if (!config.allowedFileTypes.includes(ext)) {
    return { ok: false, reason: `File type '${ext}' is not allowed` };
  }

  if (attachment.sizeBytes > config.maxFileSizeMB * 1024 * 1024) {
    return { ok: false, reason: `File is larger than ${config.maxFileSizeMB}MB` };
  }

  if (!isSenderAllowed(attachment, config)) {
    return { ok: false, reason: "Sender is not allowed" };
  }

  const detected = await fileTypeFromFile(attachment.filePath);
  const acceptedDetectedTypes = allowedContainerMatches[ext] ?? [];
  if (
    detected &&
    detected.ext !== ext &&
    !(detected.ext === "jpg" && ext === "jpeg") &&
    !acceptedDetectedTypes.includes(detected.ext)
  ) {
    return { ok: false, reason: `File content looks like '${detected.ext}', not '${ext}'` };
  }

  return { ok: true };
}

function isSenderAllowed(attachment: IncomingAttachment, config: AppConfig): boolean {
  const numberAllowed =
    config.allowedNumbers.length === 0 || config.allowedNumbers.includes(attachment.senderPhone);
  const groupAllowed =
    !attachment.groupName ||
    (config.allowGroupPrinting &&
      (config.allowedGroups.length === 0 || config.allowedGroups.includes(attachment.groupName)));

  return numberAllowed && groupAllowed;
}
