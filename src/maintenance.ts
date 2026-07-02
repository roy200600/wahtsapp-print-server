import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, execFileSync, spawn } from "node:child_process";
import { promisify } from "node:util";
import { appPaths, rootDir } from "./paths.js";

const execFileAsync = promisify(execFile);
const startupShortcutName = "WhatsApp Print Server.lnk";
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
  return { enabled: fs.existsSync(shortcutPath) || hasRegistryRunEntry(), shortcutPath };
}

export async function enableStartup(): Promise<{ enabled: boolean; shortcutPath: string }> {
  fs.mkdirSync(path.join(rootDir, "scripts"), { recursive: true });
  fs.writeFileSync(getStartupScriptPath(), startupScriptContent(), "utf8");

  const shortcutPath = getStartupShortcutPath();
  const scriptPath = getStartupScriptPath();
  const powershellPath = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`;
  const argumentsText = `-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "${scriptPath}"`;

  await execFileAsync("powershell.exe", [
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

  return getStartupStatus();
}

export function disableStartup(): { enabled: boolean; shortcutPath: string } {
  fs.rmSync(getStartupShortcutPath(), { force: true });
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

export async function runUpdate(): Promise<{ started: boolean; message: string }> {
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

export function getCurrentVersion(): string {
  try {
    const packagePath = path.join(rootDir, "package.json");
    const parsed = JSON.parse(fs.readFileSync(packagePath, "utf8")) as { version?: string };
    return parsed.version || "unknown";
  } catch {
    return "unknown";
  }
}

function getStartupShortcutPath(): string {
  return path.join(
    os.homedir(),
    "AppData",
    "Roaming",
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    startupShortcutName
  );
}

function getStartupScriptPath(): string {
  return path.join(rootDir, "scripts", "start-server-hidden.ps1");
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
    "$runtimeNode = Join-Path $project 'runtime\\node\\node.exe'",
    "if (Test-Path $runtimeNode) { $node = $runtimeNode } else { $node = (Get-Command node.exe -ErrorAction Stop).Source }",
    "Start-Process -FilePath $node -ArgumentList @('dist/main.js') -WorkingDirectory $project -WindowStyle Hidden"
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
    const { stdout } = await execFileAsync("powershell.exe", [
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
    const { stdout } = await execFileAsync("powershell.exe", [
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
