import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, chmodSync, statSync } from "node:fs";
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
node "${scriptPath}" --scan-staged "$1"
`;

  writeFileSync(hookPath, hook, { mode: 0o755 });
  chmodSync(hookPath, statSync(hookPath).mode | 0o111);
  console.log(`installed commit-msg hook: ${hookPath}`);
}

export function installTemplateHook(template: string): void {
  const gitDir = getGitDir();
  const hookPath = join(gitDir, "hooks", "prepare-commit-msg");
  mkdirSync(join(gitDir, "hooks"), { recursive: true });

  const hook = `#!/bin/sh
COMMIT_MSG_FILE="$1"
if [ ! -s "$COMMIT_MSG_FILE" ]; then
  cat > "$COMMIT_MSG_FILE" << 'COMMIT_DISCIPLINE_TEMPLATE'
${template}
COMMIT_DISCIPLINE_TEMPLATE
fi
`;

  writeFileSync(hookPath, hook, { mode: 0o755 });
  chmodSync(hookPath, statSync(hookPath).mode | 0o111);
  console.log(`installed prepare-commit-msg hook: ${hookPath}`);
}
