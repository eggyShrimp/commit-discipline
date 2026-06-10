import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_FILENAME, DEFAULT_CONFIG, type ValidationConfig } from "./types.js";

export interface ConfigResult {
  config: Record<string, unknown> | null;
  warnings: string[];
}

const TYPE_CHECKS: Record<string, (v: unknown) => boolean> = {
  min_summary_lines: (v) => typeof v === "number",
  max_summary_lines: (v) => typeof v === "number",
  scan_staged: (v) => typeof v === "boolean",
  allow_merge_commits: (v) => typeof v === "boolean",
  allow_revert_commits: (v) => typeof v === "boolean",
  warn_only: (v) => typeof v === "boolean",
  output_json: (v) => typeof v === "boolean",
  allowed_scopes: (v) => Array.isArray(v),
  template: (v) => typeof v === "string",
};

const FIELD_LABELS: Record<string, string> = {
  min_summary_lines: "min_summary_lines",
  max_summary_lines: "max_summary_lines",
  scan_staged: "scan_staged",
  allow_merge_commits: "allow_merge_commits",
  allow_revert_commits: "allow_revert_commits",
  warn_only: "warn_only",
  output_json: "output_json",
  allowed_scopes: "allowed_scopes",
  template: "template",
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
        const label = FIELD_LABELS[key] ?? key;
        const expected = key === "allowed_scopes" ? "array" : key === "min_summary_lines" || key === "max_summary_lines" ? "number" : "boolean";
        warnings.push(`${CONFIG_FILENAME}: '${label}' should be ${expected}, got ${typeof value}`);
      }
    } else {
      clean[key] = value;
    }
  }

  return { config: clean, warnings };
}

export function applyConfig(
  fileConfig: Record<string, unknown> | null,
  cliArgs: {
    minSummaryLines?: number | null;
    maxSummaryLines?: number | null;
    scanStaged?: boolean;
    noMergeCommits?: boolean;
    noRevertCommits?: boolean;
    warnOnly?: boolean;
    outputJson?: boolean;
  },
): ValidationConfig {
  const fc = fileConfig ?? {};

  const minSummary =
    cliArgs.minSummaryLines ?? (typeof fc.min_summary_lines === "number" ? fc.min_summary_lines : DEFAULT_CONFIG.minSummaryLines);
  const maxSummary =
    cliArgs.maxSummaryLines ?? (typeof fc.max_summary_lines === "number" ? fc.max_summary_lines : DEFAULT_CONFIG.maxSummaryLines);

  const allowedScopesRaw = fc.allowed_scopes;
  const allowedScopes = Array.isArray(allowedScopesRaw) ? (allowedScopesRaw as string[]) : null;

  return {
    minSummaryLines: minSummary,
    maxSummaryLines: maxSummary,
    scanStaged: cliArgs.scanStaged || (typeof fc.scan_staged === "boolean" && fc.scan_staged),
    allowMergeCommits: !cliArgs.noMergeCommits && (typeof fc.allow_merge_commits === "boolean" ? fc.allow_merge_commits : DEFAULT_CONFIG.allowMergeCommits),
    allowRevertCommits: !cliArgs.noRevertCommits && (typeof fc.allow_revert_commits === "boolean" ? fc.allow_revert_commits : DEFAULT_CONFIG.allowRevertCommits),
    warnOnly: cliArgs.warnOnly || (typeof fc.warn_only === "boolean" && fc.warn_only),
    outputJson: cliArgs.outputJson || (typeof fc.output_json === "boolean" && fc.output_json),
    allowedScopes,
    template: typeof fc.template === "string" ? fc.template : null,
  };
}
