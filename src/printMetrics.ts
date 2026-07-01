import fs from "node:fs";
import path from "node:path";
import { appPaths } from "./paths.js";

type PrintMetric = {
  durationMs: number;
  completedAt: string;
};

const metricsPath = path.join(appPaths.dataDir, "print-metrics.json");

export function savePrintDuration(id: string, durationMs: number): void {
  const metrics = readMetrics();
  metrics[id] = {
    durationMs,
    completedAt: new Date().toISOString()
  };
  fs.mkdirSync(appPaths.dataDir, { recursive: true });
  fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2), "utf8");
}

export function getPrintDuration(id: string): number | undefined {
  return readMetrics()[id]?.durationMs;
}

function readMetrics(): Record<string, PrintMetric> {
  if (!fs.existsSync(metricsPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(metricsPath, "utf8").replace(/^\uFEFF/, "")) as Record<string, PrintMetric>;
  } catch {
    return {};
  }
}
