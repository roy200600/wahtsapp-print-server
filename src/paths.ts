import path from "node:path";

export const rootDir = process.cwd();

export const appPaths = {
  configDir: path.join(rootDir, "config"),
  downloadsDir: path.join(rootDir, "downloads"),
  printedDir: path.join(rootDir, "printed"),
  failedDir: path.join(rootDir, "failed"),
  logsDir: path.join(rootDir, "logs"),
  tempDir: path.join(rootDir, "temp"),
  dataDir: path.join(rootDir, "data"),
  authDir: path.join(rootDir, "auth"),
  toolsDir: path.join(rootDir, "tools")
};

export const settingsPath = path.join(appPaths.configDir, "settings.json");
export const databasePath = path.join(appPaths.dataDir, "printserver.db");
