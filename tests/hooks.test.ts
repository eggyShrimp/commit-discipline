import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execSync } from "node:child_process";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { installHook, removeHook } from "../src/hooks.js";

let origCwd: string;
let tmpDir: string | undefined;

function makeTmpGitRepo(): string {
  const dir = join(import.meta.dirname ?? process.cwd(), `.test-hooks-tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  execSync("git init", { cwd: dir, stdio: "pipe" });
  return dir;
}

beforeEach(() => {
  origCwd = process.cwd();
});

afterEach(() => {
  process.chdir(origCwd);
  if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
  tmpDir = undefined;
});

describe("installHook", () => {
  it("installs commit-msg hook", () => {
    tmpDir = makeTmpGitRepo();
    process.chdir(tmpDir);
    installHook("/test/script.js");
    const hookPath = join(tmpDir, ".git", "hooks", "commit-msg");
    expect(existsSync(hookPath)).toBe(true);
    const content = readFileSync(hookPath, "utf-8");
    expect(content).toContain("node");
    expect(content).toContain("script.js");
  });

  it("fails outside git repo", () => {
    tmpDir = join(import.meta.dirname ?? process.cwd(), `.test-hooks-nogit-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    process.chdir(tmpDir);
    const origEnv = process.env.GIT_CEILING_DIRECTORIES;
    try {
      process.env.GIT_CEILING_DIRECTORIES = dirname(tmpDir);
      expect(() => installHook("/test/script.js")).toThrow("not inside a git repository");
    } finally {
      if (origEnv !== undefined) {
        process.env.GIT_CEILING_DIRECTORIES = origEnv;
      } else {
        delete process.env.GIT_CEILING_DIRECTORIES;
      }
    }
  });
});

describe("removeHook", () => {
  it("removes installed hook", () => {
    tmpDir = makeTmpGitRepo();
    process.chdir(tmpDir);
    installHook("/test/script.js");
    const hookPath = join(tmpDir, ".git", "hooks", "commit-msg");
    expect(existsSync(hookPath)).toBe(true);
    removeHook();
    expect(existsSync(hookPath)).toBe(false);
  });

  it("reports no hook found", () => {
    tmpDir = makeTmpGitRepo();
    process.chdir(tmpDir);
    const hookPath = join(tmpDir, ".git", "hooks", "commit-msg");
    expect(existsSync(hookPath)).toBe(false);
    removeHook();
  });

  it("refuses to remove non-commit-discipline hook", () => {
    tmpDir = makeTmpGitRepo();
    process.chdir(tmpDir);
    const hookPath = join(tmpDir, ".git", "hooks", "commit-msg");
    writeFileSync(hookPath, "#!/bin/sh\necho custom hook\n", { mode: 0o755 });
    expect(() => removeHook()).toThrow("not installed by commit-discipline");
  });

  it("fails outside git repo", () => {
    tmpDir = join(import.meta.dirname ?? process.cwd(), `.test-hooks-rm-nogit-${Date.now()}`);
    mkdirSync(tmpDir, { recursive: true });
    process.chdir(tmpDir);
    const origEnv = process.env.GIT_CEILING_DIRECTORIES;
    try {
      process.env.GIT_CEILING_DIRECTORIES = dirname(tmpDir);
      expect(() => removeHook()).toThrow("not inside a git repository");
    } finally {
      if (origEnv !== undefined) {
        process.env.GIT_CEILING_DIRECTORIES = origEnv;
      } else {
        delete process.env.GIT_CEILING_DIRECTORIES;
      }
    }
  });
});
