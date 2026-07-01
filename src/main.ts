import { createAdminServer } from "./adminServer.js";
import { ensureDirectories, loadConfig } from "./config.js";
import type { AppConfig } from "./types.js";
import { WhatsAppService } from "./whatsapp.js";
import { logger } from "./logger.js";
import { sendSystemAlert } from "./alerts.js";
import { cleanupPrintedFilesOlderThan } from "./maintenance.js";
import { getLicenseStatus } from "./license.js";

ensureDirectories();

let runtimeConfig: AppConfig = loadConfig();
const whatsapp = new WhatsAppService(() => runtimeConfig);
const app = createAdminServer(whatsapp, (config) => {
  runtimeConfig = config;
});

app.listen(runtimeConfig.port, () => {
  logger.info({ port: runtimeConfig.port }, "Admin server started");
  console.log(`WhatsApp Print Server running: http://localhost:${runtimeConfig.port}`);
});

const licenseStatus = getLicenseStatus();
if (licenseStatus.canRun) {
  void whatsapp.start().catch((error) => {
    logger.error({ error }, "WhatsApp failed to start");
    sendSystemAlert("כשל בחיבור ל־WhatsApp", error instanceof Error ? error.message : String(error));
  });
} else {
  logger.warn({ licenseStatus }, "WhatsApp auto-start blocked by license status");
}

setInterval(() => {
  const result = cleanupPrintedFilesOlderThan(7);
  if (result.deleted > 0 || result.errors.length > 0) {
    logger.info({ result }, "Weekly printed files cleanup completed");
  }
}, 24 * 60 * 60 * 1000);

process.on("uncaughtException", (error) => {
  logger.error({ error }, "Unhandled exception");
  sendSystemAlert("חריגה (Unhandled Exception)", error.message);
});

process.on("unhandledRejection", (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  logger.error({ reason }, "Unhandled rejection");
  sendSystemAlert("כל Error שלא נתפס (Unhandled Error)", message);
});
