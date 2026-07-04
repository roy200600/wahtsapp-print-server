import fs from "node:fs";
import path from "node:path";

let cachedPowerShellPath: string | undefined;

export function getPowerShellPath(): string {
  if (cachedPowerShellPath) return cachedPowerShellPath;

  const windowsRoot = process.env.SystemRoot || process.env.WINDIR || "C:\\Windows";
  const candidates = [
    path.join(windowsRoot, "System32", "WindowsPowerShell", "v1.0", "powershell.exe"),
    "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
    "powershell.exe"
  ];

  cachedPowerShellPath = candidates.find((candidate) => candidate === "powershell.exe" || fs.existsSync(candidate)) ?? "powershell.exe";
  return cachedPowerShellPath;
}

