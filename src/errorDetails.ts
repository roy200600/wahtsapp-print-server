const detailKeys = [
  "name",
  "message",
  "code",
  "errno",
  "syscall",
  "path",
  "cmd",
  "command",
  "stdout",
  "stderr",
  "signal",
  "killed",
  "stack"
] as const;

export function describeError(error: unknown): string {
  const details = errorDetailsForAlert(error);
  const detailLines = Object.entries(details)
    .filter(([key]) => key !== "message")
    .map(([key, value]) => `${key}: ${stringifyValue(value)}`)
    .filter(Boolean);

  const suffix = detailLines.length ? `\n\nTechnical details:\n${detailLines.join("\n")}` : "";

  if (error instanceof Error && error.message.trim()) {
    return `${error.message}${suffix}`;
  }

  if (typeof error === "string" && error.trim()) {
    return `${error.trim()}${suffix}`;
  }

  if (typeof details.message === "string" && details.message.trim()) {
    return `${details.message.trim()}${suffix}`;
  }

  if (Object.keys(details).length > 0) {
    return safeJson(details);
  }

  return "Unknown error";
}

export function errorDetailsForAlert(error: unknown): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  const record = toRecord(error);

  if (!record) {
    if (typeof error === "string" && error.trim()) {
      details.error = trimLong(error.trim());
    }
    return details;
  }

  for (const key of detailKeys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") {
      continue;
    }
    details[key] = typeof value === "string" ? trimLong(value) : value;
  }

  if (Object.keys(details).length === 0) {
    const fallback = safeJson(record);
    if (fallback !== "{}") {
      details.errorJson = trimLong(fallback);
    }
  }

  return details;
}

function toRecord(error: unknown): Record<string, unknown> | undefined {
  if (!error || (typeof error !== "object" && typeof error !== "function")) {
    return undefined;
  }

  const record: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(error), ...detailKeys])) {
    record[key] = (error as Record<string, unknown>)[key];
  }
  return record;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return safeJson(value);
}

function trimLong(value: string): string {
  const maxLength = 3500;
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength)}... [truncated]`;
}
