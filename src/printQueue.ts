import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function stopPrintQueue(printerName: string): Promise<{ stopped: number; printerName: string }> {
  if (!printerName.trim()) {
    throw new Error("No printer selected");
  }

  const encodedPrinterName = Buffer.from(printerName, "utf8").toString("base64");
  const command = [
    `$printerName = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${encodedPrinterName}'))`,
    "$jobs = Get-PrintJob -PrinterName $printerName -ErrorAction SilentlyContinue",
    "$count = 0",
    "foreach ($job in $jobs) {",
    "  if ($job.DocumentName -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}-') { continue }",
    "  Stop-PrintJob -PrinterName $printerName -ID $job.ID -ErrorAction SilentlyContinue",
    "  Remove-PrintJob -PrinterName $printerName -ID $job.ID -ErrorAction SilentlyContinue",
    "  $count++",
    "}",
    "Write-Output $count"
  ].join("; ");

  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    command
  ], { encoding: "utf8" });

  return { stopped: Number(stdout.trim()) || 0, printerName };
}
