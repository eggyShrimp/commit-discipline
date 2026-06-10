# Commit Discipline

A reusable skill and linter for AI-assisted commits. Enforces structured commit messages with intent, impact, verification, and AI attribution.

## Install

```bash
npx skills add <owner>/commit-discipline
```

Or clone directly:

```bash
git clone <repo-url> ~/.agents/skills/commit-discipline
```

## Contents

- `SKILL.md` — agent workflow definition
- `src/` — TypeScript source for the commit message linter
- `references/commit-message-schema.md` — schema specification
- `tests/` — validator tests

## Setup

```bash
npm install
npm run build
```

## Linter Usage

Validate a commit message:

```bash
node dist/index.js .git/COMMIT_EDITMSG
```

Install hooks:

```bash
node dist/index.js --install-hook
node dist/index.js --install-template-hook
```

Print the default commit template:

```bash
node dist/index.js --print-template
```

Warn-only mode (exit 0 even on failure):

```bash
node dist/index.js --warn-only .git/COMMIT_EDITMSG
```

JSON output for CI:

```bash
node dist/index.js --json .git/COMMIT_EDITMSG
```

Strict summary length:

```bash
node dist/index.js \
  --min-summary-lines 4 \
  --max-summary-lines 12 \
  .git/COMMIT_EDITMSG
```

## Configuration

Create `.commit-discipline.config.json` in the project root. CLI flags override config values.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `min_summary_lines` | int | `1` | Minimum bullet points in Summary section |
| `max_summary_lines` | int | `12` | Maximum bullet points in Summary section |
| `allowed_scopes` | list[str] | `null` | Scope whitelist. `null` means any scope is allowed |
| `allow_merge_commits` | bool | `true` | Skip validation for git-generated merge messages |
| `allow_revert_commits` | bool | `true` | Skip validation for git-generated revert messages |
| `warn_only` | bool | `false` | Exit 0 even on validation failure (warnings only) |
| `output_json` | bool | `false` | Output results as JSON |
| `scan_staged` | bool | `false` | Scan staged diff for secrets before validating |
| `template` | string | `null` | Custom commit template for `--print-template` and hooks |

Example (strict project):

```json
{
  "min_summary_lines": 3,
  "max_summary_lines": 8,
  "allowed_scopes": ["core", "api", "ui", "docs"],
  "allow_merge_commits": false,
  "allow_revert_commits": false,
  "scan_staged": true
}
```

Example (lenient project):

```json
{
  "min_summary_lines": 1,
  "warn_only": true
}
```

## Validate This Repository

```bash
npm test
node dist/index.js tests/fixtures/valid_commit.txt
```

## License

MIT
