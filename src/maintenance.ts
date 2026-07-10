import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync, spawn } from "node:child_process";
import { promisify } from "node:util";
import { appPaths, rootDir } from "./paths.js";
import { APP_VERSION } from "./version.js";
import { getPowerShellPath } from "./powershell.js";

const execFileAsync = promisify(execFile);
const startupShortcutName = "MY-PC WhatsApp Print Server.lnk";
const legacyStartupShortcutNames = ["WhatsApp Print Server.lnk"];
const registryRunName = "WhatsAppPrintServer";
const repoApiLatestCommitUrl = "https://api.github.com/repos/roy200600/wahtsapp-print-server/commits/main";
const repoRawPackageUrl = "https://raw.githubusercontent.com/roy200600/wahtsapp-print-server/main/package.json";

export function cleanupPrintedFiles(): { deleted: number; errors: Array<{ file: string; error: string }> } {
  fs.mkdirSync(appPaths.printedDir, { recursive: true });
  let deleted = 0;
  const errors: Array<{ file: string; error: string }> = [];

  for (const entry of fs.readdirSync(appPaths.printedDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const filePath = path.join(appPaths.printedDir, entry.name);
    try {
      fs.unlinkSync(filePath);
      deleted += 1;
    } catch (error) {
      errors.push({ file: entry.name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { deleted, errors };
}

export function cleanupPrintedFilesOlderThan(days: number): { deleted: number; errors: Array<{ file: string; error: string }> } {
  fs.mkdirSync(appPaths.printedDir, { recursive: true });
  let deleted = 0;
  const errors: Array<{ file: string; error: string }> = [];
  const cutoff = Date.now() - Math.max(1, days) * 24 * 60 * 60 * 1000;

  for (const entry of fs.readdirSync(appPaths.printedDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const filePath = path.join(appPaths.printedDir, entry.name);
    try {
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs > cutoff) continue;
      fs.unlinkSync(filePath);
      deleted += 1;
    } catch (error) {
      errors.push({ file: entry.name, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { deleted, errors };
}

export function getStartupStatus(): { enabled: boolean; shortcutPath: string } {
  const shortcutPath = getStartupShortcutPath();
  return { enabled: getStartupShortcutPaths().some((candidate) => fs.existsSync(candidate)) || hasRegistryRunEntry(), shortcutPath };
}

export async function enableStartup(): Promise<{ enabled: boolean; shortcutPath: string }> {
  fs.mkdirSync(path.join(rootDir, "scripts"), { recursive: true });
  fs.writeFileSync(getStartupScriptPath(), startupScriptContent(), "utf8");

  const shortcutPath = getStartupShortcutPath();
  const scriptPath = getStartupScriptPath();
  const powershellPath = getPowerShellPath();
  const argumentsText = `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}"`;

  await execFileAsync(powershellPath, [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    [
      "$shell = New-Object -ComObject WScript.Shell",
      `$shortcut = $shell.CreateShortcut(${JSON.stringify(shortcutPath)})`,
      `$shortcut.TargetPath = ${JSON.stringify(powershellPath)}`,
      `$shortcut.Arguments = ${JSON.stringify(argumentsText)}`,
      `$shortcut.WorkingDirectory = ${JSON.stringify(rootDir)}`,
      "$shortcut.WindowStyle = 7",
      "$shortcut.Save()"
    ].join("; ")
  ]);

  for (const legacyPath of getLegacyStartupShortcutPaths()) {
    fs.rmSync(legacyPath, { force: true });
  }

  return getStartupStatus();
}

export function disableStartup(): { enabled: boolean; shortcutPath: string } {
  for (const shortcutPath of getStartupShortcutPaths()) {
    fs.rmSync(shortcutPath, { force: true });
  }
  removeRegistryRunEntry();
  return getStartupStatus();
}

export async function checkForUpdates(): Promise<{
  available: boolean;
  current: string;
  latest: string;
  currentRevision: string;
  latestRevision: string;
  message: string;
}> {
  const current = getCurrentVersion();
  const latest = await getLatestVersion();
  const currentRevision = getCurrentRevision();
  const latestRevision = await getLatestRevision();
  const available = compareVersions(latest, current) > 0 || (current === "unknown" && latest !== "unknown");

  return {
    available,
    current,
    latest,
    currentRevision,
    latestRevision,
    message: available ? "נמצא עדכון חדש ב-GitHub." : "המערכת מעודכנת."
  };
}

async function runUpdateDetachedLegacy(): Promise<{ started: boolean; message: string }> {
  const scriptPath = path.join(rootDir, "scripts", "update-windows.ps1");
  if (!fs.existsSync(scriptPath)) {
    throw new Error("Update script was not found.");
  }

  const powershellPath = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
  const child = spawn(powershellPath, [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-WindowStyle",
    "Hidden",
    "-File",
    scriptPath
  ], {
    detached: true,
    windowsHide: true,
    stdio: "ignore"
  });
  child.unref();

  return { started: true, message: "העדכון הופעל ברקע. המתן כדקה ואז רענן את הדף." };
}

export type UpdateRunStatus = {
  status: "idle" | "starting" | "running" | "completed" | "failed";
  message: string;
  startedAt?: string;
  finishedAt?: string;
  exitCode?: number | null;
  logPath: string;
  notifyJid?: string;
  notificationSent?: boolean;
  notificationSentAt?: string;
};

export function getUpdateStatus(): UpdateRunStatus {
  const statusPath = getUpdateStatusPath();
  const logPath = getUpdateLogPath();
  if (!fs.existsSync(statusPath)) {
    return {
      status: "idle",
      message: "No update was started yet.",
      logPath
    };
  }

  try {
    return {
      logPath,
      ...JSON.parse(fs.readFileSync(statusPath, "utf8"))
    };
  } catch {
    return {
      status: "failed",
      message: "Update status file could not be read.",
      logPath
    };
  }
}

export async function runUpdate(options: { notifyJid?: string } = {}): Promise<{ started: boolean; message: string; status: UpdateRunStatus }> {
  const scriptPath = path.join(rootDir, "scripts", "update-windows.ps1");
  if (!fs.existsSync(scriptPath)) {
    throw new Error("Update script was not found.");
  }

  const existingStatus = getUpdateStatus();
  if (isActiveUpdateStatus(existingStatus)) {
    return {
      started: false,
      message: "עדכון כבר רץ ברקע. המתן להודעת סיום או בדוק סטטוס בעוד כמה דקות.",
      status: existingStatus
    };
  }

  fs.mkdirSync(appPaths.logsDir, { recursive: true });
  const statusPath = getUpdateStatusPath();
  const logPath = getUpdateLogPath();
  const wrapperPath = path.join(appPaths.logsDir, "run-update-wrapper.ps1");
  const startedAt = new Date().toISOString();
  const initialStatus: UpdateRunStatus = {
    status: "starting",
    message: "Update process was queued.",
    startedAt,
    logPath,
    notifyJid: options.notifyJid
  };
  fs.writeFileSync(statusPath, JSON.stringify(initialStatus, null, 2), "utf8");
  fs.writeFileSync(logPath, `MY-PC update started at ${startedAt}\r\n`, "utf8");
  fs.writeFileSync(wrapperPath, updateWrapperScript(scriptPath, statusPath, logPath, rootDir), "utf8");

  const powershellPath = getPowerShellPath();
  try {
    await execFileAsync(powershellPath, [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      [
        `$powerShell = ${JSON.stringify(powershellPath)}`,
        `$wrapper = ${JSON.stringify(wrapperPath)}`,
        `$workingDir = ${JSON.stringify(rootDir)}`,
        "$arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"' + $wrapper + '\"'",
        "Start-Process -FilePath $powerShell -ArgumentList $arguments -WorkingDirectory $workingDir -WindowStyle Hidden"
      ].join("; ")
    ]);
  } catch (error) {
    try {
      fs.writeFileSync(statusPath, JSON.stringify({
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
        startedAt,
        finishedAt: new Date().toISOString(),
        exitCode: 1,
        logPath,
        notifyJid: options.notifyJid
      }, null, 2), "utf8");
    } catch {}
  }

  return {
    started: true,
    message: "העדכון הופעל ברקע. המערכת שומרת לוג עדכון ותנסה להחזיר את השרת גם אם העדכון ייכשל.",
    status: initialStatus
  };
}

export function markUpdateNotificationSent(): UpdateRunStatus {
  const current = getUpdateStatus();
  if (current.status !== "completed" && current.status !== "failed") {
    return current;
  }

  const next: UpdateRunStatus = {
    ...current,
    notificationSent: true,
    notificationSentAt: new Date().toISOString()
  };
  fs.writeFileSync(getUpdateStatusPath(), JSON.stringify(next, null, 2), "utf8");
  return next;
}

export function getCurrentVersion(): string {
  return APP_VERSION;
}

function getStartupShortcutPath(): string {
  return path.join(getStartupDir(), startupShortcutName);
}

function getStartupShortcutPaths(): string[] {
  return [getStartupShortcutPath(), ...getLegacyStartupShortcutPaths()];
}

function getLegacyStartupShortcutPaths(): string[] {
  return legacyStartupShortcutNames.map((name) => path.join(getStartupDir(), name));
}

function getStartupDir(): string {
  return path.join(
    os.homedir(),
    "AppData",
    "Roaming",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup"
  );
}

function getStartupScriptPath(): string {
  return path.join(rootDir, "scripts", "start-server-hidden.ps1");
}

function getUpdateStatusPath(): string {
  return path.join(appPaths.logsDir, "update-status.json");
}

function getUpdateLogPath(): string {
  return path.join(appPaths.logsDir, "update-latest.log");
}

function updateWrapperScript(scriptPath: string, statusPath: string, logPath: string, projectRoot: string): string {
  const startScript = path.join(projectRoot, "scripts", "start-windows.ps1");
  const powershellPath = getPowerShellPath();
  return [
    "$ErrorActionPreference = 'Stop'",
    "$startedAt = (Get-Date).ToString('o')",
    `$statusPath = ${JSON.stringify(statusPath)}`,
    `$logPath = ${JSON.stringify(logPath)}`,
    `$scriptPath = ${JSON.stringify(scriptPath)}`,
    `$startScript = ${JSON.stringify(startScript)}`,
    `$powerShellPath = ${JSON.stringify(powershellPath)}`,
    "$existing = $null",
    "try { $existing = Get-Content -LiteralPath $statusPath -Raw | ConvertFrom-Json } catch {}",
    "function Write-UpdateStatus($State, $Message, $ExitCode) {",
    "  $payload = @{ status = $State; message = $Message; startedAt = $startedAt; finishedAt = (Get-Date).ToString('o'); exitCode = $ExitCode; logPath = $logPath }",
    "  if ($existing -and $existing.notifyJid) { $payload.notifyJid = [string]$existing.notifyJid }",
    "  $payload | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $statusPath -Encoding UTF8",
    "}",
    "Write-UpdateStatus 'running' 'Update script is running.' $null",
    "try {",
    "  Add-Content -LiteralPath $logPath -Value ('Running update script: ' + $scriptPath)",
    "  & $scriptPath *>&1 | Tee-Object -FilePath $logPath -Append",
    "  if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw ('Update script exited with code ' + $LASTEXITCODE) }",
    "  Write-UpdateStatus 'completed' 'Update completed. Server restart was requested.' 0",
    "} catch {",
    "  $message = $_.Exception.Message",
    "  Add-Content -LiteralPath $logPath -Value ('Update failed: ' + $message)",
    "  Write-UpdateStatus 'failed' $message 1",
    "  try {",
    "    Add-Content -LiteralPath $logPath -Value 'Trying to restart the existing server after update failure.'",
    "    & $powerShellPath -NoProfile -ExecutionPolicy Bypass -File $startScript -Hidden *>&1 | Tee-Object -FilePath $logPath -Append",
    "  } catch {",
    "    Add-Content -LiteralPath $logPath -Value ('Server restart after update failure also failed: ' + $_.Exception.Message)",
    "  }",
    "  exit 1",
    "}"
  ].join("\r\n");
}

function hasRegistryRunEntry(): boolean {
  try {
    const output = execFileSync("reg.exe", [
      "query",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
      "/v",
      registryRunName
    ]);
    return output.toString("utf8").includes(registryRunName);
  } catch {
    return false;
  }
}

function removeRegistryRunEntry(): void {
  try {
    execFileSync("reg.exe", [
      "delete",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
      "/v",
      registryRunName,
      "/f"
    ]);
  } catch {
    // Missing registry entries are fine; the Startup shortcut is the primary mechanism.
  }
}

function startupScriptContent(): string {
  return [
    "$ErrorActionPreference = \"Stop\"",
    "try {",
    "  $Utf8NoBom = New-Object System.Text.UTF8Encoding($false)",
    "  [Console]::InputEncoding = $Utf8NoBom",
    "  [Console]::OutputEncoding = $Utf8NoBom",
    "  $OutputEncoding = $Utf8NoBom",
    "} catch {}",
    "$project = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path",
    "Set-Location -LiteralPath $project",
    "$startScript = Join-Path $project 'scripts\\start-windows.ps1'",
    "$startScriptArgument = '\"' + $startScript + '\"'",
    "$powershell = Join-Path $env:SystemRoot 'System32\\WindowsPowerShell\\v1.0\\powershell.exe'",
    "Start-Process -FilePath $powershell -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', $startScriptArgument, '-Hidden') -WorkingDirectory $project -WindowStyle Hidden"
  ].join("\r\n");
}

function getCurrentRevision(): string {
  const gitHeadPath = path.join(rootDir, ".git", "HEAD");
  if (!fs.existsSync(gitHeadPath)) return "zip-install";

  const head = fs.readFileSync(gitHeadPath, "utf8").trim();
  if (!head.startsWith("ref:")) return head.slice(0, 12);

  const refPath = path.join(rootDir, ".git", head.replace("ref:", "").trim());
  if (!fs.existsSync(refPath)) return "zip-install";
  return fs.readFileSync(refPath, "utf8").trim().slice(0, 12);
}

async function getLatestVersion(): Promise<string> {
  try {
    const { stdout } = await execFileAsync(getPowerShellPath(), [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      [
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12",
        `$response = Invoke-RestMethod -Uri ${JSON.stringify(repoRawPackageUrl)} -Headers @{ 'User-Agent' = 'MY-PC-WhatsAppPrintServer' }`,
        "$response.version"
      ].join("; ")
    ]);
    return stdout.trim() || "unknown";
  } catch {
    return "unknown";
  }
}

async function getLatestRevision(): Promise<string> {
  try {
    const { stdout } = await execFileAsync(getPowerShellPath(), [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      [
        "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12",
        `$response = Invoke-RestMethod -Uri ${JSON.stringify(repoApiLatestCommitUrl)} -Headers @{ 'User-Agent' = 'MY-PC-WhatsAppPrintServer' }`,
        "$response.sha"
      ].join("; ")
    ]);
    return stdout.trim().slice(0, 12) || "unknown";
  } catch {
    return "unknown";
  }
}

function isActiveUpdateStatus(status: UpdateRunStatus): boolean {
  if (status.status !== "starting" && status.status !== "running") {
    return false;
  }

  const startedAt = status.startedAt ? Date.parse(status.startedAt) : 0;
  if (!Number.isFinite(startedAt) || startedAt <= 0) {
    return false;
  }

  const maxAgeMs = status.status === "starting" ? 2 * 60 * 1000 : 30 * 60 * 1000;
  return Date.now() - startedAt < maxAgeMs;
}

function compareVersions(a: string, b: string): number {
  if (a === "unknown" && b === "unknown") return 0;
  if (a === "unknown") return 0;
  if (b === "unknown") return 1;

  const left = a.split(".").map((part) => Number(part) || 0);
  const right = b.split(".").map((part) => Number(part) || 0);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}
