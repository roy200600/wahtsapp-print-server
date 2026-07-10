import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { appPaths } from "./paths.js";
import { logger } from "./logger.js";

const execFileAsync = promisify(execFile);

export interface RemoteSupportResult {
  teamViewerPath: string;
  screenshotPath: string;
}

export function getRemoteSupportStatus(): { teamViewerExists: boolean; teamViewerPath: string } {
  const teamViewerPath = findTeamViewerQuickSupport() ?? path.join(appPaths.toolsDir, "TeamViewerQS", "TeamViewerQS.exe");
  return {
    teamViewerExists: fs.existsSync(teamViewerPath),
    teamViewerPath
  };
}

export async function startRemoteSupportSession(): Promise<RemoteSupportResult> {
  const teamViewerPath = await ensureTeamViewerQuickSupport();
  if (!teamViewerPath) {
    throw new Error("TeamViewer QS was not found under tools\\TeamViewerQS. Run the installer/update first.");
  }

  await stopTeamViewerProcesses();
  await launchTeamViewerQuickSupport(teamViewerPath);
  const screenshotPath = await captureScreen();

  return { teamViewerPath, screenshotPath };
}

export async function captureScreen(): Promise<string> {
  fs.mkdirSync(appPaths.tempDir, { recursive: true });
  const screenshotPath = path.join(appPaths.tempDir, `remote-support-${Date.now()}.png`);
  const script = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "Add-Type -AssemblyName System.Drawing",
    "$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds",
    "$bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height",
    "$graphics = [System.Drawing.Graphics]::FromImage($bitmap)",
    "$graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)",
    `$bitmap.Save(${JSON.stringify(screenshotPath)}, [System.Drawing.Imaging.ImageFormat]::Png)`,
    "$graphics.Dispose()",
    "$bitmap.Dispose()"
  ].join("; ");

  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script
  ], { windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });

  return screenshotPath;
}

async function stopTeamViewerProcesses(): Promise<void> {
  const script = [
    "$patterns = @('TeamViewer*','TeamViewerQS*','tv_w32','tv_x64')",
    "$processes = Get-Process -ErrorAction SilentlyContinue | Where-Object {",
    "  $name = $_.ProcessName",
    "  $patterns | Where-Object { $name -like $_ }",
    "}",
    "foreach ($process in $processes) {",
    "  try { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } catch {}",
    "}",
    "Start-Sleep -Seconds 2"
  ].join("; ");

  try {
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ], { windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });
  } catch (error) {
    logger.warn({ err: error }, "TeamViewer process cleanup failed; continuing remote support launch");
  }
}

async function launchTeamViewerQuickSupport(teamViewerPath: string): Promise<void> {
  const script = [
    `$path = ${JSON.stringify(teamViewerPath)}`,
    "Start-Process -FilePath $path -WorkingDirectory (Split-Path -Parent $path)"
  ].join("; ");

  await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script
  ], { windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024 });

  await new Promise((resolve) => setTimeout(resolve, 6000));
}

async function ensureTeamViewerQuickSupport(): Promise<string | undefined> {
  const existing = findTeamViewerQuickSupport();
  if (existing) {
    return existing;
  }

  const targetDir = path.join(appPaths.toolsDir, "TeamViewerQS");
  const targetPath = path.join(targetDir, "TeamViewerQS.exe");
  fs.mkdirSync(targetDir, { recursive: true });

  const script = [
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12",
    `$target = ${JSON.stringify(targetPath)}`,
    `$dir = ${JSON.stringify(targetDir)}`,
    "New-Item -ItemType Directory -Force -Path $dir | Out-Null",
    "Invoke-WebRequest -Uri 'https://download.teamviewer.com/download/TeamViewerQS.exe' -OutFile $target",
    "if (-not (Test-Path -LiteralPath $target)) { throw 'TeamViewerQS.exe was not downloaded.' }",
    "if ((Get-Item -LiteralPath $target).Length -lt 1MB) { Remove-Item -LiteralPath $target -Force -ErrorAction SilentlyContinue; throw 'Downloaded TeamViewerQS.exe is too small.' }"
  ].join("; ");

  try {
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      script
    ], { windowsHide: true, timeout: 120000, maxBuffer: 1024 * 1024 });
  } catch (error) {
    logger.error({ err: error, targetPath }, "TeamViewer QS download failed");
    return undefined;
  }

  return findTeamViewerQuickSupport();
}

function findTeamViewerQuickSupport(): string | undefined {
  const candidates = [
    path.join(appPaths.toolsDir, "TeamViewerQS", "TeamViewerQS.exe"),
    path.join(appPaths.toolsDir, "TeamViewerQS.exe")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

export function formatRemoteSupportCaption(): string {
  return [
    "🛟 תמיכה מרחוק הופעלה",
    "",
    "TeamViewer QS נפתח במחשב הלקוח.",
    "מצורף צילום מסך נוכחי כדי לזהות את מזהה/סיסמת ההתחברות.",
    "",
    `מחשב: ${os.hostname()}`,
    `זמן: ${new Date().toLocaleString("he-IL")}`
  ].join("\n");
}
