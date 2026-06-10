import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync, chmodSync, statSync, unlinkSync, existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
const HOOK_START = "# commit-discipline start";
const HOOK_END = "# commit-discipline end";
const HOOK_BLOCK_PATTERN = new RegExp(`\\n?${HOOK_START}\\n[\\s\\S]*?\\n${HOOK_END}\\n?`, "m");
function getGitDir() {
    try {
        const gitDir = execSync("git rev-parse --git-dir", { encoding: "utf-8" }).trim();
        return isAbsolute(gitDir) ? gitDir : resolve(process.cwd(), gitDir);
    }
    catch {
        throw new Error("not inside a git repository");
    }
}
function getRepoRoot() {
    try {
        return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
    }
    catch {
        throw new Error("not inside a git repository");
    }
}
function getConfiguredHooksPath() {
    try {
        const hooksPath = execSync("git config --get core.hooksPath", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "ignore"],
        }).trim();
        return hooksPath || null;
    }
    catch {
        return null;
    }
}
function getHooksDir() {
    const configured = getConfiguredHooksPath();
    if (configured) {
        return isAbsolute(configured) ? configured : resolve(getRepoRoot(), configured);
    }
    return join(getGitDir(), "hooks");
}
function buildHookBlock(scriptPath) {
    return `${HOOK_START}
node "${scriptPath}" "$1" || exit $?
${HOOK_END}`;
}
function upsertHookBlock(content, block) {
    const normalized = content.replace(/\r\n/g, "\n").replace(/\s+$/, "");
    if (HOOK_BLOCK_PATTERN.test(normalized)) {
        return `${normalized.replace(HOOK_BLOCK_PATTERN, `\n${block}\n`).trimEnd()}\n`;
    }
    return `${normalized}\n\n${block}\n`;
}
export function installHook(scriptPath) {
    const hooksDir = getHooksDir();
    const hookPath = join(hooksDir, "commit-msg");
    mkdirSync(hooksDir, { recursive: true });
    const hook = existsSync(hookPath)
        ? upsertHookBlock(readFileSync(hookPath, "utf-8"), buildHookBlock(scriptPath))
        : `#!/bin/sh

${buildHookBlock(scriptPath)}
`;
    writeFileSync(hookPath, hook, { mode: 0o755 });
    chmodSync(hookPath, statSync(hookPath).mode | 0o111);
    console.log(`installed commit-msg hook: ${hookPath}`);
}
export function removeHook() {
    const hookPath = join(getHooksDir(), "commit-msg");
    if (!existsSync(hookPath)) {
        console.log("no commit-msg hook found");
        return;
    }
    const content = readFileSync(hookPath, "utf-8").replace(/\r\n/g, "\n");
    if (!HOOK_BLOCK_PATTERN.test(content)) {
        throw new Error("commit-msg hook exists but was not installed by commit-discipline");
    }
    const next = content.replace(HOOK_BLOCK_PATTERN, "\n").trim();
    if (!next || next === "#!/bin/sh") {
        unlinkSync(hookPath);
        console.log(`removed commit-msg hook: ${hookPath}`);
        return;
    }
    writeFileSync(hookPath, `${next}\n`, { mode: 0o755 });
    chmodSync(hookPath, statSync(hookPath).mode | 0o111);
    console.log(`removed commit-discipline block from commit-msg hook: ${hookPath}`);
}
//# sourceMappingURL=hooks.js.map