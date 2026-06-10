# Commit Discipline

A reusable skill and linter for AI-assisted commits. Enforces structured commit messages with intent, impact, verification, and AI attribution.

## Capabilities

- **Validate commit messages** — enforce structured format with Why / Impact / Summary / Verification / AI-Agent / Convention-Version. Reads from file path or stdin.
- **Manage git hooks** — install or remove a `commit-msg` hook that validates every commit automatically.
- **JSON output** — machine-readable results for agent and CI integration.

## Install

```bash
npx skills add <owner>/commit-discipline
```

Or clone directly:

```bash
git clone <repo-url> ~/.agents/skills/commit-discipline
```

## Setup

```bash
npm install
npm run build
```

## CLI

```bash
commit-discipline [message-file]     # validate (stdin if no file)
commit-discipline --json [file]      # validate + JSON output
commit-discipline --install-hook     # install commit-msg hook
commit-discipline --remove-hook      # remove commit-msg hook
commit-discipline --version          # print version
commit-discipline --help             # show help
```

## Enable Git Hook From The Skill

Installing the skill with `npx skills add` makes the instructions available to the agent, but it does not automatically modify `.git/hooks`.

From the target repository, run:

```bash
node <skill>/scripts/install-hook.mjs
```

The script uses the bundled JavaScript validator that ships with the skill, then installs or updates the `commit-msg` hook without replacing existing hook content.

## Configuration

Create `.commit-discipline.config.json` in the project root.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `scan_staged` | `boolean` | `false` | Scan staged diff for secrets before validating |
| `allow_merge_commits` | `boolean` | `true` | Skip validation for git-generated merge messages |
| `allow_revert_commits` | `boolean` | `true` | Skip validation for git-generated revert messages |
| `warn_only` | `boolean` | `false` | Exit 0 even on validation failure (warnings only) |
| `output_json` | `boolean` | `false` | Output results as JSON |
| `allowed_scopes` | `string[]` | `null` | Scope whitelist. `null` means any scope is allowed |

Example:

```json
{
  "allowed_scopes": ["core", "api", "ui", "docs"],
  "allow_merge_commits": false,
  "allow_revert_commits": false,
  "scan_staged": true
}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Validation passed (or `warn_only`) |
| `1` | Validation failed |
| `2` | Runtime error (file not found, malformed config, not in git repo) |

## Validate This Repository

```bash
npm test
node dist/index.js tests/fixtures/valid_commit.txt
```

## Skill Behavior Eval

```bash
npm run test:skill
```

The skill eval sends direct OpenAI-compatible model requests and checks whether the skill instructions produce the expected first-use and daily-use behavior.

Use these environment variables:

```bash
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.deepseek.com/v1
SKILL_EVAL_MODEL=deepseek-v4-flash
```

For local runs, copy `.skill-eval.env.example` to `.skill-eval.env`. The local file is ignored by git. In GitHub Actions, set `OPENAI_API_KEY` and `OPENAI_BASE_URL` as repository secrets, and optionally set `SKILL_EVAL_MODEL` as a repository variable. If no key is configured, the eval skips without failing.

## License

MIT
