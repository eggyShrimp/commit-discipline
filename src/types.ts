export const VERSION = "0.2.0";

export const CONFIG_FILENAME = ".commit-discipline.config.json";

export const ALLOWED_TYPES = new Set([
  "feat",
  "fix",
  "docs",
  "refactor",
  "test",
  "chore",
  "build",
  "ci",
  "perf",
  "style",
  "revert",
]);

export const VAGUE_SUBJECTS = new Set([
  "change",
  "changes",
  "fix",
  "misc",
  "modify",
  "stuff",
  "temp",
  "test",
  "update",
  "updates",
  "wip",
]);

export const AI_TRAILERS: readonly string[] = [
  "AI-Agent:",
  "AI-Generated:",
  "Co-developed-by:",
];

export const SECRET_PATTERNS: readonly RegExp[] = [
  /(api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*['"][^'"]{8,}['"]/i,
  /authorization:\s*bearer\s+[a-z0-9._~+/=-]{12,}/i,
  /sk-[A-Za-z0-9]{20,}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /ASIA[0-9A-Z]{16}/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
  /-----BEGIN[ A-Z]*PRIVATE KEY-----/,
];

export interface ValidationConfig {
  scanStaged: boolean;
  allowMergeCommits: boolean;
  allowRevertCommits: boolean;
  warnOnly: boolean;
  outputJson: boolean;
  allowedScopes: string[] | null;
}

export const DEFAULT_CONFIG: ValidationConfig = {
  scanStaged: false,
  allowMergeCommits: true,
  allowRevertCommits: true,
  warnOnly: false,
  outputJson: false,
  allowedScopes: null,
};
