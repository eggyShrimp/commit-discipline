#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CommitMessageValidator } from "./validate.js";
import { loadConfig, applyConfig } from "./config.js";
import { scanTextForSecrets, stagedDiff } from "./secrets.js";
import { installHook, removeHook } from "./hooks.js";
import { VERSION } from "./types.js";
function buildArgs() {
    return parseArgs({
        allowPositionals: true,
        options: {
            version: { type: "boolean", short: "v" },
            "install-hook": { type: "boolean" },
            "remove-hook": { type: "boolean" },
            json: { type: "boolean" },
            help: { type: "boolean", short: "h" },
        },
    });
}
function printHelp() {
    const help = `commit-discipline ${VERSION}

Validate AI-assisted commit messages.

Usage:
  commit-discipline [options] [message-file]
  echo "message" | commit-discipline [options]

Options:
  --install-hook     Install commit-msg hook
  --remove-hook      Remove commit-msg hook
  --json             Output results as JSON
  -v, --version      Print version
  -h, --help         Show this help

Config: place .commit-discipline.config.json in the project root for project-level defaults.
`;
    process.stdout.write(help);
}
function readMessage(path) {
    if (path) {
        return readFileSync(resolve(path), "utf-8");
    }
    return readFileSync(0, "utf-8");
}
function formatErrors(errors) {
    return errors.map((e) => `- ${e}`).join("\n");
}
export function main() {
    const args = buildArgs();
    if (args.values.help) {
        printHelp();
        return 0;
    }
    if (args.values.version) {
        console.log(`commit-discipline ${VERSION}`);
        return 0;
    }
    if (args.values["install-hook"]) {
        try {
            const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), "index.js");
            installHook(scriptPath);
            return 0;
        }
        catch (err) {
            process.stderr.write(`error: ${err instanceof Error ? err.message : err}\n`);
            return 2;
        }
    }
    if (args.values["remove-hook"]) {
        try {
            removeHook();
            return 0;
        }
        catch (err) {
            process.stderr.write(`error: ${err instanceof Error ? err.message : err}\n`);
            return 2;
        }
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
    const config = applyConfig(fileConfig);
    let message;
    try {
        message = readMessage(args.positionals[0]);
    }
    catch (err) {
        process.stderr.write(`error: ${err instanceof Error ? err.message : err}\n`);
        return 2;
    }
    const errors = new CommitMessageValidator(config).validate(message);
    if (config.scanStaged) {
        try {
            errors.push(...scanTextForSecrets(stagedDiff()));
        }
        catch (err) {
            errors.push(err instanceof Error ? err.message : String(err));
        }
    }
    if (args.values.json || config.outputJson) {
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
//# sourceMappingURL=index.js.map