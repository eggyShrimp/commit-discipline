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

  it("config file with warn_only exits 0", () => {
    const dir = join(import.meta.dirname ?? process.cwd(), ".test-integration-tmp");
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, ".commit-discipline.config.json"), JSON.stringify({ warn_only: true }));
      const result = spawnSync("node", [SCRIPT, INVALID], {
        encoding: "utf-8",
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toContain("warnings");
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("config file with allow_merge_commits false validates merge", () => {
    const dir = join(import.meta.dirname ?? process.cwd(), ".test-integration-tmp2");
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, ".commit-discipline.config.json"), JSON.stringify({ allow_merge_commits: false }));
      const result = spawnSync("node", [SCRIPT, VALID], {
        encoding: "utf-8",
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
      });
      expect(result.status).toBe(0);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });

  it("install and remove hook", () => {
    const dir = join(import.meta.dirname ?? process.cwd(), ".test-integration-hooks");
    mkdirSync(dir, { recursive: true });
    try {
      spawnSync("git", ["init"], { cwd: dir, stdio: "pipe" });
      const hookPath = join(dir, ".git", "hooks", "commit-msg");

      const installResult = spawnSync("node", [SCRIPT, "--install-hook"], {
        encoding: "utf-8",
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
      });
      expect(installResult.status).toBe(0);
      expect(installResult.stdout).toContain("installed");
      expect(require("node:fs").existsSync(hookPath)).toBe(true);

      const removeResult = spawnSync("node", [SCRIPT, "--remove-hook"], {
        encoding: "utf-8",
        cwd: dir,
        stdio: ["pipe", "pipe", "pipe"],
      });
      expect(removeResult.status).toBe(0);
      expect(removeResult.stdout).toContain("removed");
      expect(require("node:fs").existsSync(hookPath)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
});
