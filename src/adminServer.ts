import express from "express";
import fs from "node:fs";
import path from "node:path";
import { appPaths, rootDir } from "./paths.js";
import { loadConfig, saveConfig } from "./config.js";
import { listRecentJobs } from "./db.js";
import {
  checkForUpdates,
  cleanupPrintedFiles,
  disableStartup,
  enableStartup,
  getCurrentVersion,
  getStartupStatus,
  getUpdateStatus,
  runUpdate
} from "./maintenance.js";
import { stopPrintQueue } from "./printQueue.js";
import { getPrintEngineStatus } from "./printEngines.js";
import { sendTestAlert } from "./alerts.js";
import {
  activateLicense,
  applyLicenseLimits,
  assertLicenseCanRun,
  getLicenseStatus,
  getRegistration,
  mergeConfigForLicense,
  saveRegistration,
  verifySuperAdminPassword
} from "./license.js";
import { runOfficePrintTest } from "./officeTests.js";
import {
  checkWindowsPrinterCompatibility,
  listWindowsPrinterDetails,
  listWindowsPrinters
} from "./windowsPrinters.js";
import type { AppConfig } from "./types.js";
import type { WhatsAppService } from "./whatsapp.js";

export function createAdminServer(whatsapp: WhatsAppService, setRuntimeConfig: (config: AppConfig) => void) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));
  app.use(express.static(path.join(rootDir, "public"), {
    setHeaders(res, filePath) {
      if (/\.(js|css)$/.test(filePath) || filePath.endsWith("sw.js")) {
        res.setHeader("Cache-Control", "no-store");
      }
    }
  }));

  app.get("/api/status", (_req, res) => {
    const license = getLicenseStatus();
    res.json({
      whatsapp: whatsapp.getState(),
      config: sanitizeConfig(applyLicenseLimits(loadConfig(), license)),
      license,
      registration: getRegistration(),
      version: getCurrentVersion()
    });
  });

  app.get("/api/license/status", (_req, res) => {
    res.json(getLicenseStatus());
  });

  app.post("/api/license/activate", (req, res) => {
    try {
      res.json(activateLicense(req.body?.license ?? req.body));
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/license/registration", (_req, res) => {
    res.json(getRegistration());
  });

  app.post("/api/license/registration", (req, res) => {
    res.json(saveRegistration(req.body ?? {}));
  });

  app.post("/api/super-admin/login", (req, res) => {
    if (verifySuperAdminPassword(String(req.body?.password ?? ""))) {
      res.json({ ok: true });
      return;
    }
    res.status(401).json({ error: "Invalid super admin password" });
  });

  app.get("/api/auth/status", (_req, res) => {
    res.json({ configured: Boolean(loadConfig().adminPassword) });
  });

  app.post("/api/auth/setup", (req, res) => {
    const password = String(req.body?.password ?? "").trim();
    if (password.length < 4) {
      res.status(400).json({ error: "Password must contain at least 4 characters" });
      return;
    }

    const config = loadConfig();
    if (config.adminPassword) {
      res.status(409).json({ error: "Admin password is already configured" });
      return;
    }

    const saved = saveConfig({ ...config, adminPassword: password });
    setRuntimeConfig(saved);
    res.json({ ok: true });
  });

  app.post("/api/auth/login", (req, res) => {
    const config = loadConfig();
    const password = String(req.body?.password ?? "");
    if (!config.adminPassword || password === config.adminPassword) {
      res.json({ ok: true });
      return;
    }
    res.status(401).json({ error: "Invalid password" });
  });

  app.get("/api/config", (_req, res) => {
    const license = getLicenseStatus();
    res.json(sanitizeConfig(applyLicenseLimits(loadConfig(), license)));
  });

  app.post("/api/config", (req, res) => {
    const existing = loadConfig();
    const incoming = req.body as AppConfig;
    const merged = mergeConfigForLicense(existing, {
      ...incoming,
      adminPassword: incoming.adminPassword ? incoming.adminPassword : existing.adminPassword,
      email: {
        ...incoming.email,
        appPassword: incoming.email?.appPassword ? incoming.email.appPassword : existing.email.appPassword
      }
    }, getLicenseStatus());
    const saved = saveConfig(merged);
    setRuntimeConfig(saved);
    res.json(sanitizeConfig(applyLicenseLimits(saved)));
  });

  app.get("/api/jobs", (_req, res) => {
    res.json(listRecentJobs());
  });

  app.get("/api/printed/files", (_req, res) => {
    if (getLicenseStatus().mode !== "licensed") {
      res.json([]);
      return;
    }
    res.json(listFiles(appPaths.printedDir));
  });

  app.get("/api/log-files", (_req, res) => {
    res.json(listFiles(appPaths.logsDir));
  });

  app.get("/api/log-files/:name", (req, res) => {
    const safeName = path.basename(req.params.name);
    const filePath = path.join(appPaths.logsDir, safeName);
    if (!filePath.startsWith(appPaths.logsDir) || !fs.existsSync(filePath)) {
      res.status(404).json({ error: "Log file not found" });
      return;
    }
    const content = fs.readFileSync(filePath, "utf8");
    res.json({ name: safeName, content: content.slice(-20000) });
  });

  app.get("/api/diagnostics/print-engines", (_req, res) => {
    res.json(getPrintEngineStatus());
  });

  app.get("/api/printers", async (_req, res) => {
    try {
      res.json(await listWindowsPrinters());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/printers/details", async (_req, res) => {
    try {
      res.json(await listWindowsPrinterDetails());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/printers/check", async (req, res) => {
    try {
      res.json(await checkWindowsPrinterCompatibility(String(req.body?.printerName ?? loadConfig().printerName)));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/startup", (_req, res) => {
    res.json(getStartupStatus());
  });

  app.post("/api/startup/enable", async (_req, res) => {
    try {
      if (getLicenseStatus().mode !== "licensed") {
        res.status(403).json({ error: "Startup with Windows is available only with an active license." });
        return;
      }
      res.json(await enableStartup());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/startup/disable", (_req, res) => {
    res.json(disableStartup());
  });

  app.get("/api/updates/check", async (_req, res) => {
    try {
      res.json(await checkForUpdates());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get("/api/updates/status", (_req, res) => {
    res.json(getUpdateStatus());
  });

  app.post("/api/updates/run", async (_req, res) => {
    try {
      res.json(await runUpdate());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/printed/cleanup", (_req, res) => {
    if (getLicenseStatus().mode !== "licensed") {
      res.status(403).json({ error: "Printed files cleanup is available only with an active license." });
      return;
    }
    res.json(cleanupPrintedFiles());
  });

  app.post("/api/office-test/:type", async (req, res) => {
    try {
      assertLicenseCanRun();
      const type = req.params.type === "powerpoint" ? "powerpoint" : "excel";
      res.json(await runOfficePrintTest(type, applyLicenseLimits(loadConfig())));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/alerts/test", async (_req, res) => {
    void sendTestAlert();
    res.json({ queued: true });
  });

  app.post("/api/printing/stop", async (_req, res) => {
    try {
      res.json(await stopPrintQueue(loadConfig().printerName));
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/whatsapp/start", async (_req, res) => {
    try {
      assertLicenseCanRun();
      await whatsapp.start();
      res.json(whatsapp.getState());
    } catch (error) {
      res.status(403).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/whatsapp/stop", async (_req, res) => {
    await whatsapp.stop();
    res.json(whatsapp.getState());
  });

  app.post("/api/whatsapp/reset", async (_req, res) => {
    try {
      assertLicenseCanRun();
      await whatsapp.reset();
      res.json(whatsapp.getState());
    } catch (error) {
      res.status(403).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  return app;
}

function listFiles(dir: string) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const filePath = path.join(dir, entry.name);
      const stats = fs.statSync(filePath);
      return {
        name: entry.name,
        size: stats.size,
        modifiedAt: stats.mtime.toISOString()
      };
    })
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}

function sanitizeConfig(config: AppConfig): AppConfig {
  return {
    ...config,
    adminPassword: "",
    email: {
      ...config.email,
      appPassword: ""
    }
  };
}
