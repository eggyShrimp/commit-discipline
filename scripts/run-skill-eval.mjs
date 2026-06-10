#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const env = process.env;
const localEnvFiles = [".skill-eval.env"];

function parseEnv(content) {
  const values = {};
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

for (const file of localEnvFiles) {
  const path = join(process.cwd(), file);
  if (!existsSync(path)) continue;
  const values = parseEnv(readFileSync(path, "utf-8"));
  for (const [key, value] of Object.entries(values)) {
    if (!env[key]) env[key] = value;
  }
}

if (!env.OPENAI_API_KEY) {
  console.log("Skipping skill eval: set OPENAI_API_KEY in the environment or .skill-eval.env.");
  process.exit(0);
}

const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
const model = env.SKILL_EVAL_MODEL || env.OPENAI_MODEL || "deepseek-v4-flash";
const skill = readFileSync("SKILL.md", "utf-8");
const hookSetup = readFileSync("references/hook-setup.md", "utf-8");

const cases = [
  {
    name: "first-use-setup",
    title: "First use installs hook",
    scenario: "A repository is using commit-discipline for the first time.",
    expects: [
      "Read the one-time hook setup reference.",
      "Use the install hook script.",
      "Preserve existing commit-msg hook content.",
    ],
    prompt: "This is the first use of commit-discipline in a Git repository. Enable automatic commit-message enforcement while preserving an existing commit-msg hook.",
    checks: [
      { name: "setup reference", expect: "references/hook-setup.md is read", test: (r) => r.read_references?.includes("references/hook-setup.md") },
      { name: "install script", expect: "scripts/install-hook.mjs is used", test: (r) => r.commands?.some((c) => c.includes("scripts/install-hook.mjs")) },
      { name: "preserve hook", expect: "rationale mentions preserving existing hook content", test: (r) => /preserv|existing/i.test(r.rationale || "") },
    ],
  },
  {
    name: "already-enabled",
    title: "Already enabled avoids reinstall",
    scenario: "The repository already has a commit-discipline block in commit-msg.",
    expects: [
      "Do not run the install script again.",
      "Treat the repository as already set up.",
      "Continue with daily commit work.",
    ],
    prompt: "The repository commit-msg hook already contains the commit-discipline start/end block. Prepare to make a normal commit without reinstalling the hook.",
    checks: [
      { name: "no install script", expect: "install-hook is not run", test: (r) => !(r.commands || []).some((c) => c.includes("install-hook")) },
      { name: "already set up", expect: "rationale identifies setup as already active", test: (r) => /already|active|installed|set up|enabled/i.test(r.rationale || "") },
      { name: "daily path", expect: "hook setup reference is not needed", test: (r) => !(r.read_references || []).includes("references/hook-setup.md") },
    ],
  },
  {
    name: "daily-commit",
    title: "Daily commit skips setup",
    scenario: "commit-discipline has already been activated.",
    expects: [
      "Do not read setup-only material.",
      "Do not run hook installation.",
      "Produce the required commit message sections.",
    ],
    prompt: "Prepare a commit message for a normal daily change after commit-discipline has already been set up. The diff adds tests and updates hook handling.",
    checks: [
      { name: "no setup reference", expect: "references/hook-setup.md is not read", test: (r) => !(r.read_references || []).includes("references/hook-setup.md") },
      { name: "no install script", expect: "install-hook is not run", test: (r) => !(r.commands || []).some((c) => c.includes("install-hook")) },
      { name: "commit fields", expect: "all required sections are present", test: (r) => ["Why:", "Impact:", "Summary:", "Verification:", "AI-Agent:", "Convention-Version:"].every((s) => (r.commit_message || "").includes(s)) },
    ],
  },
  {
    name: "existing-project-convention",
    title: "Existing project convention is respected",
    scenario: "A repository already requires ticket-prefixed Conventional Commit subjects.",
    expects: [
      "Keep the project-specific subject prefix.",
      "Still include commit-discipline attribution and verification fields.",
      "Do not force a conflicting format.",
    ],
    prompt: "Prepare a commit message for a repository whose existing convention requires the subject to start with '[APP-123] '. The change fixes hook installation docs. Keep that project convention while applying commit-discipline requirements.",
    checks: [
      { name: "project ticket", expect: "subject keeps [APP-123]", test: (r) => (r.commit_message || "").split("\n")[0]?.includes("[APP-123]") },
      { name: "required fields", expect: "commit-discipline fields are still present", test: (r) => ["Why:", "Impact:", "Summary:", "Verification:", "AI-Agent:", "Convention-Version:"].every((s) => (r.commit_message || "").includes(s)) },
      { name: "no setup path", expect: "daily commit does not trigger setup", test: (r) => !(r.commands || []).some((c) => c.includes("install-hook")) },
    ],
  },
  {
    name: "validation-failure-repair",
    title: "Validation failure is repaired",
    scenario: "A draft commit message fails validation.",
    expects: [
      "Repair the message instead of bypassing validation.",
      "Run or recommend the bundled validator.",
      "Return a complete valid commit message shape.",
    ],
    prompt: "A draft commit message failed validation because it only says 'fix: update'. Repair the commit message for a change that preserves existing hooks while adding hook setup guidance.",
    checks: [
      { name: "validator used", expect: "bundled validator is used or recommended", test: (r) => (r.commands || []).some((c) => c.includes("dist/index.js")) || (r.commit_message || "").includes("dist/index.js") || /validator|validate/i.test(r.rationale || "") },
      { name: "not bypassed", expect: "rationale does not suggest bypassing validation", test: (r) => !/bypass|skip.*validat|ignore.*validat/i.test(r.rationale || "") },
      { name: "commit fields", expect: "all required sections are present", test: (r) => ["Why:", "Impact:", "Summary:", "Verification:", "AI-Agent:", "Convention-Version:"].every((s) => (r.commit_message || "").includes(s)) },
    ],
  },
];

function extractJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error(`model did not return JSON: ${text.slice(0, 300)}`);
    return JSON.parse(match[0]);
  }
}

async function runCase(testCase) {
  const body = {
    model,
    messages: [
      {
        role: "system",
        content: [
          "You are testing whether an agent would follow this SKILL.md.",
          "Return only JSON with keys: read_references, commands, commit_message, rationale.",
          "read_references and commands must be arrays of strings.",
          "Use exact file paths in read_references when reading references.",
        ].join("\n"),
      },
      {
        role: "user",
        content: [
          "<SKILL.md>",
          skill,
          "</SKILL.md>",
          "<references/hook-setup.md>",
          hookSetup,
          "</references/hook-setup.md>",
          "<task>",
          testCase.prompt,
          "</task>",
        ].join("\n"),
      },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${testCase.name}: ${response.status} ${text.slice(0, 500)}`);
  }

  const data = await response.json();
  const result = extractJson(data.choices?.[0]?.message?.content || "");
  const checks = testCase.checks.map((check) => ({
    name: check.name,
    expect: check.expect,
    passed: Boolean(check.test(result)),
  }));
  return { name: testCase.name, checks, result };
}

console.log(`Skill eval model: ${model}`);
console.log(`Skill eval cases: ${cases.length}`);
for (const testCase of cases) {
  console.log(`- ${testCase.name}: ${testCase.title}`);
}
console.log("");

let failed = false;
const reports = [];
for (const testCase of cases) {
  console.log(`CASE ${testCase.name}`);
  console.log(`  ${testCase.title}`);
  console.log(`  Scenario: ${testCase.scenario}`);
  console.log("  Expects:");
  for (const expect of testCase.expects) {
    console.log(`  - ${expect}`);
  }

  const report = await runCase(testCase);
  reports.push(report);
  const passed = report.checks.every((c) => c.passed);
  console.log(`  Result: ${passed ? "PASS" : "FAIL"}`);
  for (const check of report.checks) {
    console.log(`  ${check.passed ? "ok" : "not ok"} - ${check.name}: ${check.expect}`);
  }
  if (!passed) {
    failed = true;
    console.log("  Model response:");
    console.log(`  read_references: ${JSON.stringify(report.result.read_references || [])}`);
    console.log(`  commands: ${JSON.stringify(report.result.commands || [])}`);
    console.log(`  rationale: ${(report.result.rationale || "").slice(0, 500)}`);
    if (report.result.commit_message) {
      console.log("  commit_message:");
      for (const line of report.result.commit_message.split("\n").slice(0, 12)) {
        console.log(`    ${line}`);
      }
    }
  }
  console.log("");
}

const passedCount = reports.filter((report) => report.checks.every((c) => c.passed)).length;
console.log(`Summary: ${passedCount}/${reports.length} cases passed`);

process.exit(failed ? 1 : 0);
