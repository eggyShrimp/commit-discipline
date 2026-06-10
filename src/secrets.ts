import { execSync } from "node:child_process";
import { SECRET_PATTERNS } from "./types.js";

export function scanTextForSecrets(text: string): string[] {
  const errors: string[] = [];
  for (let i = 0; i < SECRET_PATTERNS.length; i++) {
    if (SECRET_PATTERNS[i].test(text)) {
      errors.push(`staged diff matched sensitive-value pattern ${i + 1}`);
    }
  }
  return errors;
}

export function stagedDiff(): string {
  try {
    return execSync("git diff --cached --", { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(msg || "failed to read staged diff");
  }
}
