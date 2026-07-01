import express from "express";
import fs from "node:fs";
import path from "node:path";
import { appPaths, rootDir } from "./paths.js";
import { loadConfig, saveConfig } from "./config.js";
import { listRecentJobs } from "./db.js";
import { cleanupPrintedFiles, disableStartup, enableStartup, getStartupStatus } from "./maintenance.js";
import { stopPrintQueue } from "./printQueue.js";
import { sendTestAlert } from "./alerts.js";
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
  app.use(express.static(path.join(rootDir, "public")));

  app.get("/api/status", (_req, res) => {
    res.json({ whatsapp: whatsapp.getState(), config: sanitizeConfig(loadConfig()) });
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
    res.json(sanitizeConfig(loadConfig()));
  });

  app.post("/api/config", (req, res) => {
    const existing = loadConfig();
    const incoming = req.body as AppConfig;
    const saved = saveConfig({
      ...incoming,
      adminPassword: incoming.adminPassword ? incoming.adminPassword : existing.adminPassword,
      email: {
        ...incoming.email,
        appPassword: incoming.email?.appPassword ? incoming.email.appPassword : existing.email.appPassword
      }
    });
    setRuntimeConfig(saved);
    res.json(sanitizeConfig(saved));
  });

  app.get("/api/jobs", (_req, res) => {
    res.json(listRecentJobs());
  });

  app.get("/api/printed/files", (_req, res) => {
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
      res.json(await enableStartup());
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/startup/disable", (_req, res) => {
    res.json(disableStartup());
  });

  app.post("/api/printed/cleanup", (_req, res) => {
    res.json(cleanupPrintedFiles());
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
    await whatsapp.start();
    res.json(whatsapp.getState());
  });

  app.post("/api/whatsapp/stop", async (_req, res) => {
    await whatsapp.stop();
    res.json(whatsapp.getState());
  });

  app.post("/api/whatsapp/reset", async (_req, res) => {
    await whatsapp.reset();
    res.json(whatsapp.getState());
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
