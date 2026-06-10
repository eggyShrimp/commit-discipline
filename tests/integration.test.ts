import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readFileSync } from "node:fs";

const ROOT = join(import.meta.dirname ?? process.cwd(), "..");
const VALID = join(ROOT, "tests", "fixtures", "valid_commit.txt");
const INVALID = join(ROOT, "tests", "fixtures", "invalid_commit.txt");
const SCRIPT = join(ROOT, "dist", "index.js");

function runValidator(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync("node", [SCRIPT, ...args], {
    encoding: "utf-8",
    cwd: ROOT,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 2,
  };
}

function runValidatorWithInput(input: string, ...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync("node", [SCRIPT, ...args], {
    encoding: "utf-8",
    cwd: ROOT,
    input,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 2,
  };
}

describe("Integration", () => {
  it("valid fixture passes", () => {
    const result = runValidator(VALID);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("passed");
  });

  it("invalid fixture fails", () => {
    const result = runValidator(INVALID);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("subject must match");
    expect(result.stderr).toContain("missing Summary");
    expect(result.stderr).toContain("missing Convention-Version");
  });

  it("strict summary count passes", () => {
    const result = runValidator("--min-summary-lines", "4", VALID);
    expect(result.exitCode).toBe(0);
  });

  it("stdin input passes", () => {
    const content = readFileSync(VALID, "utf-8");
    const result = runValidatorWithInput(content);
    expect(result.exitCode).toBe(0);
  });

  it("file not found returns 2", () => {
    const result = runValidator("/nonexistent/file.txt");
    expect(result.exitCode).toBe(2);
  });

  it("version flag", () => {
    const result = runValidator("--version");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("commit-discipline");
  });

  it("print template", () => {
    const result = runValidator("--print-template");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("<type>(<scope>)");
    expect(result.stdout).toContain("Why:");
    expect(result.stdout).toContain("AI-Agent:");
  });

  it("json output valid", () => {
    const result = runValidator("--json", VALID);
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.valid).toBe(true);
    expect(data.errors).toEqual([]);
  });

  it("json output invalid", () => {
    const result = runValidator("--json", INVALID);
    expect(result.exitCode).toBe(1);
    const data = JSON.parse(result.stdout);
    expect(data.valid).toBe(false);
    expect(data.errors.length).toBeGreaterThan(0);
  });

  it("warn-only exit 0", () => {
    const result = runValidator("--warn-only", INVALID);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain("warnings");
  });

  it("warn-only with json", () => {
    const result = runValidator("--warn-only", "--json", INVALID);
    expect(result.exitCode).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.valid).toBe(false);
    expect(data.warn_only).toBe(true);
  });

  it("negative min summary lines", () => {
    const result = runValidator("--min-summary-lines=-1", VALID);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain(">= 0");
  });

  it("max less than min", () => {
    const result = runValidator("--min-summary-lines", "5", "--max-summary-lines", "3", VALID);
    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain(">= --min-summary-lines");
  });

  it("config file overrides defaults", () => {
    const dir = join(import.meta.dirname ?? process.cwd(), ".test-integration-tmp");
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, ".commit-discipline.config.json"), JSON.stringify({ min_summary_lines: 5, max_summary_lines: 10 }));
      const result = spawnSync("node", [SCRIPT, VALID], {
        encoding: "utf-8",
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
      });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain("at least 5");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("CLI overrides config file", () => {
    const dir = join(import.meta.dirname ?? process.cwd(), ".test-integration-tmp2");
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, ".commit-discipline.config.json"), JSON.stringify({ min_summary_lines: 10 }));
      const result = spawnSync("node", [SCRIPT, "--min-summary-lines", "1", VALID], {
        encoding: "utf-8",
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
      });
      expect(result.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
