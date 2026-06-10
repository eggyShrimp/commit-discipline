import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, chmodSync, statSync, unlinkSync, existsSync } from "node:fs";
import { join } from "node:path";

function getGitDir(): string {
  try {
    return execSync("git rev-parse --git-dir", { encoding: "utf-8" }).trim();
  } catch {
    throw new Error("not inside a git repository");
  }
}

export function installHook(scriptPath: string): void {
  const gitDir = getGitDir();
  const hookPath = join(gitDir, "hooks", "commit-msg");
  mkdirSync(join(gitDir, "hooks"), { recursive: true });

  const hook = `#!/bin/sh
# commit-discipline hook
node "${scriptPath}" "$1"
`;

  writeFileSync(hookPath, hook, { mode: 0o755 });
  chmodSync(hookPath, statSync(hookPath).mode | 0o111);
  console.log(`installed commit-msg hook: ${hookPath}`);
}

export function removeHook(): void {
  const gitDir = getGitDir();
  const hookPath = join(gitDir, "hooks", "commit-msg");

  if (!existsSync(hookPath)) {
    console.log("no commit-msg hook found");
    return;
  }

  const content = execSync(`cat "${hookPath}"`, { encoding: "utf-8" });
  if (!content.includes("commit-discipline")) {
    throw new Error("commit-msg hook exists but was not installed by commit-discipline");
  }

  unlinkSync(hookPath);
  console.log(`removed commit-msg hook: ${hookPath}`);
}
