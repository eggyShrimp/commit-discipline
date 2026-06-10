import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig, applyConfig } from "../src/config.js";
import { DEFAULT_CONFIG } from "../src/types.js";

const TEST_DIR = join(import.meta.dirname ?? process.cwd(), ".test-config-tmp");

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
});

describe("loadConfig", () => {
  it("returns empty config when no file exists", () => {
    const result = loadConfig(join(TEST_DIR, "missing.json"));
    expect(result.config).toEqual({});
    expect(result.warnings).toEqual([]);
  });

  it("loads valid config", () => {
    const config = { allow_merge_commits: false, scan_staged: true };
    writeFileSync(join(TEST_DIR, "config.json"), JSON.stringify(config));
    const result = loadConfig(join(TEST_DIR, "config.json"));
    expect(result.config).toEqual(config);
    expect(result.warnings).toEqual([]);
  });

  it("handles malformed JSON", () => {
    writeFileSync(join(TEST_DIR, "config.json"), "{bad json");
    const result = loadConfig(join(TEST_DIR, "config.json"));
    expect(result.config).toBeNull();
    expect(result.warnings.some((w) => w.includes("not valid JSON"))).toBe(true);
  });

  it("handles non-object root type", () => {
    writeFileSync(join(TEST_DIR, "config.json"), '"not an object"');
    const result = loadConfig(join(TEST_DIR, "config.json"));
    expect(result.config).toBeNull();
    expect(result.warnings.some((w) => w.includes("JSON object"))).toBe(true);
  });

  it("warns on wrong field type", () => {
    const config = { scan_staged: "not a boolean" };
    writeFileSync(join(TEST_DIR, "config.json"), JSON.stringify(config));
    const result = loadConfig(join(TEST_DIR, "config.json"));
    expect(result.config).not.toBeNull();
    expect(result.warnings.some((w) => w.includes("should be"))).toBe(true);
  });
});

describe("applyConfig", () => {
  it("uses defaults when no config", () => {
    const result = applyConfig({});
    expect(result.scanStaged).toBe(DEFAULT_CONFIG.scanStaged);
    expect(result.allowMergeCommits).toBe(DEFAULT_CONFIG.allowMergeCommits);
    expect(result.allowRevertCommits).toBe(DEFAULT_CONFIG.allowRevertCommits);
  });

  it("loads values from config", () => {
    const result = applyConfig({
      scan_staged: true,
      allow_merge_commits: false,
      warn_only: true,
    });
    expect(result.scanStaged).toBe(true);
    expect(result.allowMergeCommits).toBe(false);
    expect(result.warnOnly).toBe(true);
  });

  it("scope whitelist from config", () => {
    const result = applyConfig({ allowed_scopes: ["core", "api"] });
    expect(result.allowedScopes).toEqual(["core", "api"]);
  });
});
