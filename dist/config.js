import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_FILENAME, DEFAULT_CONFIG } from "./types.js";
const TYPE_CHECKS = {
    scan_staged: (v) => typeof v === "boolean",
    allow_merge_commits: (v) => typeof v === "boolean",
    allow_revert_commits: (v) => typeof v === "boolean",
    warn_only: (v) => typeof v === "boolean",
    output_json: (v) => typeof v === "boolean",
    allowed_scopes: (v) => Array.isArray(v),
};
const EXPECTED_TYPES = {
    scan_staged: "boolean",
    allow_merge_commits: "boolean",
    allow_revert_commits: "boolean",
    warn_only: "boolean",
    output_json: "boolean",
    allowed_scopes: "array",
};
export function loadConfig(configPath) {
    const filePath = configPath ?? join(process.cwd(), CONFIG_FILENAME);
    let raw;
    try {
        raw = readFileSync(filePath, "utf-8");
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return { config: {}, warnings: [] };
        }
        throw err;
    }
    let data;
    try {
        data = JSON.parse(raw);
    }
    catch (exc) {
        const msg = exc instanceof Error ? exc.message : String(exc);
        return { config: null, warnings: [`${CONFIG_FILENAME} is not valid JSON: ${msg}`] };
    }
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
        return { config: null, warnings: [`${CONFIG_FILENAME} must be a JSON object`] };
    }
    const obj = data;
    const warnings = [];
    const clean = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key in TYPE_CHECKS) {
            const check = TYPE_CHECKS[key];
            if (check(value)) {
                clean[key] = value;
            }
            else {
                const expected = EXPECTED_TYPES[key] ?? "unknown";
                warnings.push(`${CONFIG_FILENAME}: '${key}' should be ${expected}, got ${typeof value}`);
            }
        }
        else {
            clean[key] = value;
        }
    }
    return { config: clean, warnings };
}
export function applyConfig(fileConfig) {
    const fc = fileConfig ?? {};
    const allowedScopesRaw = fc.allowed_scopes;
    const allowedScopes = Array.isArray(allowedScopesRaw) ? allowedScopesRaw : null;
    return {
        scanStaged: typeof fc.scan_staged === "boolean" ? fc.scan_staged : DEFAULT_CONFIG.scanStaged,
        allowMergeCommits: typeof fc.allow_merge_commits === "boolean" ? fc.allow_merge_commits : DEFAULT_CONFIG.allowMergeCommits,
        allowRevertCommits: typeof fc.allow_revert_commits === "boolean" ? fc.allow_revert_commits : DEFAULT_CONFIG.allowRevertCommits,
        warnOnly: typeof fc.warn_only === "boolean" ? fc.warn_only : DEFAULT_CONFIG.warnOnly,
        outputJson: typeof fc.output_json === "boolean" ? fc.output_json : DEFAULT_CONFIG.outputJson,
        allowedScopes,
    };
}
//# sourceMappingURL=config.js.map