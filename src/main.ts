import { createAdminServer } from "./adminServer.js";
import { ensureDirectories, loadConfig } from "./config.js";
import type { AppConfig } from "./types.js";
import { WhatsAppService } from "./whatsapp.js";
import { logger } from "./logger.js";
import { sendSystemAlert } from "./alerts.js";
import { cleanupPrintedFilesOlderThan } from "./maintenance.js";
import { getLicenseStatus } from "./license.js";
import { appPaths } from "./paths.js";
import { recoverInterruptedJobs } from "./db.js";
import { stopPrintQueue } from "./printQueue.js";
import { describeError } from "./errorDetails.js";

ensureDirectories();

let runtimeConfig: AppConfig = loadConfig();
const whatsapp = new WhatsAppService(() => runtimeConfig);
const app = createAdminServer(whatsapp, (config) => {
  runtimeConfig = config;
});

const server = app.listen(runtimeConfig.port, () => {
  logger.info({ port: runtimeConfig.port }, "Admin server started");
  console.log(`WhatsApp Print Server running: http://localhost:${runtimeConfig.port}`);
});

server.on("error", (error) => {
  const listenError = error as NodeJS.ErrnoException;
  if (listenError.code === "EADDRINUSE") {
    logger.warn({ port: runtimeConfig.port }, "Admin server is already running or the port is in use");
    console.log(`WhatsApp Print Server is already running or port ${runtimeConfig.port} is in use.`);
    process.exit(1);
  }

  throw error;
});

void recoverStartupState().finally(() => {
  const licenseStatus = getLicenseStatus();
  if (licenseStatus.canRun) {
    void whatsapp.start().catch((error) => {
      logger.error({ err: error }, "WhatsApp failed to start");
      sendSystemAlert("כשל בחיבור ל־WhatsApp", describeError(error));
    });
  } else {
    logger.warn({ licenseStatus }, "WhatsApp auto-start blocked by license status");
  }
});

setInterval(() => {
  const status = getLicenseStatus();
  if (!status.canRun && whatsapp.getState().connected) {
    void whatsapp.stop(false).catch((error) => {
      logger.error({ err: error }, "Failed to stop WhatsApp after license lock");
    });
  }
}, 60 * 1000);

setInterval(() => {
  const result = cleanupPrintedFilesOlderThan(7);
  if (result.deleted > 0 || result.errors.length > 0) {
    logger.info({ result }, "Weekly printed files cleanup completed");
  }
}, 24 * 60 * 60 * 1000);

process.on("uncaughtException", (error) => {
  logger.error({ err: error }, "Unhandled exception");
  sendSystemAlert("חריגה (Unhandled Exception)", describeError(error));
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection");
  sendSystemAlert("כל Error שלא נתפס (Unhandled Error)", describeError(reason));
});

async function recoverStartupState(): Promise<void> {
  const recovery = recoverInterruptedJobs(appPaths.failedDir, runtimeConfig.printerName);
  if (recovery.recovered > 0 || recovery.errors.length > 0) {
    logger.warn({ recovery }, "Recovered interrupted print jobs from previous run");
  }

  const printerNames = new Set<string>();
  if (runtimeConfig.printerName.trim()) {
    printerNames.add(runtimeConfig.printerName.trim());
  }
  for (const profile of runtimeConfig.printerProfiles || []) {
    if (profile.printerName?.trim()) {
      printerNames.add(profile.printerName.trim());
    }
  }

  for (const printerName of printerNames) {
    try {
      const result = await stopPrintQueue(printerName);
      if (result.stopped > 0) {
        logger.warn({ result }, "Removed stale MY-PC print jobs from Windows spooler during startup");
      }
    } catch (error) {
      logger.error({ err: error, printerName }, "Failed to clear startup print queue");
    }
  }
}
