#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CommitMessageValidator } from "./validate.js";
import { loadConfig, applyConfig } from "./config.js";
import { scanTextForSecrets, stagedDiff } from "./secrets.js";
import { installHook, installTemplateHook } from "./hooks.js";
import { getEffectiveTemplate, printTemplate } from "./template.js";
import { VERSION } from "./types.js";

function buildArgs() {
  return parseArgs({
    allowPositionals: true,
    options: {
      version: { type: "boolean", short: "v" },
      "min-summary-lines": { type: "string" },
      "max-summary-lines": { type: "string" },
      "scan-staged": { type: "boolean" },
      "install-hook": { type: "boolean" },
      "install-template-hook": { type: "boolean" },
      "print-template": { type: "boolean" },
      "no-merge-commits": { type: "boolean" },
      "no-revert-commits": { type: "boolean" },
      "warn-only": { type: "boolean" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
    },
  });
}

function printHelp(): void {
  const help = `commit-discipline ${VERSION}

Validate AI-assisted commit messages.

Usage:
  commit-discipline [options] [message-file]
  echo "message" | commit-discipline [options]

Options:
  --min-summary-lines N    Minimum bullet points in Summary
  --max-summary-lines N    Maximum bullet points in Summary
  --scan-staged            Scan staged diff for secrets
  --install-hook           Install commit-msg hook
  --install-template-hook  Install prepare-commit-msg hook
  --print-template         Print the commit template
  --no-merge-commits       Validate merge commit messages
  --no-revert-commits      Validate revert commit messages
  --warn-only              Output warnings, exit 0
  --json                   Output results as JSON
  -v, --version            Print version
  -h, --help               Show this help

Config: place .commit-discipline.config.json in the project root for project-level defaults.
CLI flags override config values.
`;
  process.stdout.write(help);
}

function readMessage(path?: string): string {
  if (path) {
    return readFileSync(resolve(path), "utf-8");
  }
  return readFileSync(0, "utf-8");
}

function formatErrors(errors: string[]): string {
  return errors.map((e) => `- ${e}`).join("\n");
}

export function main(): number {
  const args = buildArgs();

  if (args.values.help) {
    printHelp();
    return 0;
  }

  if (args.values.version) {
    console.log(`commit-discipline ${VERSION}`);
    return 0;
  }

  const { config: fileConfig, warnings: configWarnings } = loadConfig();
  if (configWarnings.length > 0) {
    for (const w of configWarnings) {
      process.stderr.write(`warning: ${w}\n`);
    }
    if (fileConfig === null) {
      return 2;
    }
  }

  const effectiveTemplate = getEffectiveTemplate(fileConfig);

  if (args.values["print-template"]) {
    printTemplate(effectiveTemplate);
    return 0;
  }

  if (args.values["install-hook"]) {
    try {
      const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), "index.js");
      installHook(scriptPath);
      return 0;
    } catch (err: unknown) {
      process.stderr.write(`error: ${err instanceof Error ? err.message : err}\n`);
      return 2;
    }
  }

  if (args.values["install-template-hook"]) {
    try {
      installTemplateHook(effectiveTemplate);
      return 0;
    } catch (err: unknown) {
      process.stderr.write(`error: ${err instanceof Error ? err.message : err}\n`);
      return 2;
    }
  }

  const minSummaryRaw = args.values["min-summary-lines"];
  const maxSummaryRaw = args.values["max-summary-lines"];
  const minSummaryParsed = minSummaryRaw != null ? Number(minSummaryRaw) : null;
  const maxSummaryParsed = maxSummaryRaw != null ? Number(maxSummaryRaw) : null;

  const minSummary =
    minSummaryParsed ?? (typeof fileConfig?.min_summary_lines === "number" ? fileConfig.min_summary_lines : 1);
  const maxSummary =
    maxSummaryParsed ?? (typeof fileConfig?.max_summary_lines === "number" ? fileConfig.max_summary_lines : 12);

  if (minSummary < 0) {
    process.stderr.write("error: --min-summary-lines must be >= 0\n");
    return 2;
  }
  if (maxSummary < minSummary) {
    process.stderr.write("error: --max-summary-lines must be >= --min-summary-lines\n");
    return 2;
  }

  const config = applyConfig(fileConfig, {
    minSummaryLines: minSummaryParsed,
    maxSummaryLines: maxSummaryParsed,
    scanStaged: args.values["scan-staged"],
    noMergeCommits: args.values["no-merge-commits"],
    noRevertCommits: args.values["no-revert-commits"],
    warnOnly: args.values["warn-only"],
    outputJson: args.values.json,
  });

  let message: string;
  try {
    message = readMessage(args.positionals[0]);
  } catch (err: unknown) {
    process.stderr.write(`error: ${err instanceof Error ? err.message : err}\n`);
    return 2;
  }

  const errors = new CommitMessageValidator(config).validate(message);

  if (config.scanStaged) {
    try {
      errors.push(...scanTextForSecrets(stagedDiff()));
    } catch (err: unknown) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (config.outputJson) {
    const result = {
      valid: errors.length === 0,
      errors,
      warn_only: config.warnOnly,
    };
    console.log(JSON.stringify(result, null, 2));
    if (errors.length > 0 && !config.warnOnly) {
      return 1;
    }
    return 0;
  }

  if (errors.length > 0) {
    const label = config.warnOnly ? "warnings" : "commit message failed validation";
    process.stderr.write(`${label}:\n`);
    process.stderr.write(formatErrors(errors) + "\n");
    if (config.warnOnly) {
      return 0;
    }
    return 1;
  }

  console.log("commit message passed validation");
  return 0;
}

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  process.exit(main());
}
