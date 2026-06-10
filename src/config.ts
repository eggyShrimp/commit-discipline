import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_FILENAME, DEFAULT_CONFIG, type ValidationConfig } from "./types.js";

export interface ConfigResult {
  config: Record<string, unknown> | null;
  warnings: string[];
}

const TYPE_CHECKS: Record<string, (v: unknown) => boolean> = {
  scan_staged: (v) => typeof v === "boolean",
  allow_merge_commits: (v) => typeof v === "boolean",
  allow_revert_commits: (v) => typeof v === "boolean",
  warn_only: (v) => typeof v === "boolean",
  output_json: (v) => typeof v === "boolean",
  allowed_scopes: (v) => Array.isArray(v),
};

const EXPECTED_TYPES: Record<string, string> = {
  scan_staged: "boolean",
  allow_merge_commits: "boolean",
  allow_revert_commits: "boolean",
  warn_only: "boolean",
  output_json: "boolean",
  allowed_scopes: "array",
};

export function loadConfig(configPath?: string): ConfigResult {
  const filePath = configPath ?? join(process.cwd(), CONFIG_FILENAME);

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return { config: {}, warnings: [] };
    }
    throw err;
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (exc: unknown) {
    const msg = exc instanceof Error ? exc.message : String(exc);
    return { config: null, warnings: [`${CONFIG_FILENAME} is not valid JSON: ${msg}`] };
  }

  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { config: null, warnings: [`${CONFIG_FILENAME} must be a JSON object`] };
  }

  const obj = data as Record<string, unknown>;
  const warnings: string[] = [];
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key in TYPE_CHECKS) {
      const check = TYPE_CHECKS[key];
      if (check(value)) {
        clean[key] = value;
      } else {
        const expected = EXPECTED_TYPES[key] ?? "unknown";
        warnings.push(`${CONFIG_FILENAME}: '${key}' should be ${expected}, got ${typeof value}`);
      }
    } else {
      clean[key] = value;
    }
  }

  return { config: clean, warnings };
}

export function applyConfig(fileConfig: Record<string, unknown> | null): ValidationConfig {
  const fc = fileConfig ?? {};

  const allowedScopesRaw = fc.allowed_scopes;
  const allowedScopes = Array.isArray(allowedScopesRaw) ? (allowedScopesRaw as string[]) : null;

  return {
    scanStaged: typeof fc.scan_staged === "boolean" ? fc.scan_staged : DEFAULT_CONFIG.scanStaged,
    allowMergeCommits: typeof fc.allow_merge_commits === "boolean" ? fc.allow_merge_commits : DEFAULT_CONFIG.allowMergeCommits,
    allowRevertCommits: typeof fc.allow_revert_commits === "boolean" ? fc.allow_revert_commits : DEFAULT_CONFIG.allowRevertCommits,
    warnOnly: typeof fc.warn_only === "boolean" ? fc.warn_only : DEFAULT_CONFIG.warnOnly,
    outputJson: typeof fc.output_json === "boolean" ? fc.output_json : DEFAULT_CONFIG.outputJson,
    allowedScopes,
  };
}
