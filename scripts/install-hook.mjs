#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillRoot = dirname(scriptDir);
const validatorEntry = join(skillRoot, "dist", "index.js");
const hooksEntry = join(skillRoot, "dist", "hooks.js");

function requireBundledFile(path) {
  if (!existsSync(path)) {
    throw new Error(`missing bundled file: ${path}`);
  }
}

try {
  requireBundledFile(validatorEntry);
  requireBundledFile(hooksEntry);
  const { installHook } = await import(pathToFileURL(hooksEntry).href);
  installHook(validatorEntry);
} catch (err) {
  process.stderr.write(`error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(2);
}
