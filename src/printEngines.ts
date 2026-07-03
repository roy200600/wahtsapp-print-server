import fs from "node:fs";
import path from "node:path";
import { appPaths } from "./paths.js";
import { loadConfig } from "./config.js";

export interface PrintEngineStatus {
  ok: boolean;
  sumatraPdf: {
    ok: boolean;
    path: string;
    source: "configured" | "bundled" | "missing";
  };
  ghostscript: {
    ok: boolean;
    path: string;
    source: "bundled" | "system" | "missing";
  };
  warnings: string[];
}

export function getPrintEngineStatus(): PrintEngineStatus {
  const sumatraPdf = findSumatraPdf();
  const ghostscript = findGhostscript();
  const warnings: string[] = [];

  if (!sumatraPdf.ok) {
    warnings.push("SumatraPDF was not found. PDF printing fallback is unavailable.");
  }

  if (!ghostscript.ok) {
    warnings.push("Ghostscript was not found. PDF compatibility mode will fall back to SumatraPDF.");
  }

  return {
    ok: sumatraPdf.ok,
    sumatraPdf,
    ghostscript,
    warnings
  };
}

function findSumatraPdf(): PrintEngineStatus["sumatraPdf"] {
  const config = loadConfig();
  const candidates = [
    { path: config.sumatraPdfPath, source: "configured" as const },
    { path: path.join(appPaths.toolsDir, "SumatraPDF", "SumatraPDF.exe"), source: "bundled" as const }
  ];

  for (const candidate of candidates) {
    if (candidate.path && fs.existsSync(candidate.path)) {
      return { ok: true, path: candidate.path, source: candidate.source };
    }
  }

  return {
    ok: false,
    path: candidates[0]?.path || "",
    source: "missing"
  };
}

function findGhostscript(): PrintEngineStatus["ghostscript"] {
  const bundledRoot = path.join(appPaths.toolsDir, "Ghostscript");
  const bundled = findFirstExisting([
    path.join(bundledRoot, "bin", "gswin64c.exe"),
    path.join(bundledRoot, "bin", "gswin32c.exe"),
    ...findByGlobDepth(bundledRoot, "bin", "gswin64c.exe"),
    ...findByGlobDepth(bundledRoot, "bin", "gswin32c.exe")
  ]);

  if (bundled) {
    return { ok: true, path: bundled, source: "bundled" };
  }

  const system = findFirstExisting([
    "C:\\Program Files\\gs\\gs*\\bin\\gswin64c.exe",
    "C:\\Program Files (x86)\\gs\\gs*\\bin\\gswin32c.exe"
  ]);

  if (system) {
    return { ok: true, path: system, source: "system" };
  }

  return { ok: false, path: "", source: "missing" };
}

function findFirstExisting(candidates: string[]): string {
  for (const candidate of candidates) {
    if (!candidate.includes("*") && fs.existsSync(candidate)) {
      return candidate;
    }

    if (candidate.includes("*")) {
      const match = findWildcardMatch(candidate);
      if (match) return match;
    }
  }

  return "";
}

function findWildcardMatch(pattern: string): string {
  const [beforeStar, afterStar] = pattern.split("*");
  const baseDir = path.dirname(beforeStar);
  const prefix = path.basename(beforeStar);
  if (!fs.existsSync(baseDir)) return "";

  const suffixParts = afterStar.split(/[\\/]/).filter(Boolean);
  const matches = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
    .map((entry) => path.join(baseDir, entry.name, ...suffixParts))
    .filter((candidate) => fs.existsSync(candidate))
    .sort()
    .reverse();

  return matches[0] || "";
}

function findByGlobDepth(root: string, childDir: string, fileName: string): string[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name, childDir, fileName));
}
