import fs from "node:fs";
import path from "node:path";
import pino from "pino";
import { appPaths } from "./paths.js";

fs.mkdirSync(appPaths.logsDir, { recursive: true });

export const logger = pino(
  {
    level: process.env.LOG_LEVEL ?? "info",
    timestamp: pino.stdTimeFunctions.isoTime
  },
  pino.destination(path.join(appPaths.logsDir, "app.log"))
);
