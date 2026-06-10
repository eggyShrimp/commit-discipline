# Commit Message Schema

This reference defines the reusable commit message schema enforced by `src/validate.ts`.

## Required Sections

The validator requires the following sections:

| Section | Requirement |
| --- | --- |
| Subject | `<type>(<scope>): <subject>` or `<type>: <subject>` |
| `Why:` | Non-empty reason for the change |
| `Impact:` | Non-empty user-visible effect, or `None` |
| `Summary:` | A bullet list of high-level changes |
| `Verification:` | A bullet list of checks and results |
| AI trailer | One of `AI-Agent:`, `AI-Generated:`, or `Co-developed-by:` |
| `Convention-Version:` | Date in `YYYY-MM-DD` format |

## Allowed Types

The validator accepts these commit types:

- `feat`
- `fix`
- `docs`
- `refactor`
- `test`
- `chore`
- `build`
- `ci`
- `perf`
- `style`
- `revert`

## Recommended Message

```text
feat(commit): add AI-assisted commit checks

Why: AI-assisted changes need a repeatable review trail.
Impact: Maintainers can reject incomplete commit messages before review.

Summary:
- Add a reusable skill for preparing agent-made commits.
- Add a validator that enforces intent, impact, verification, and attribution.
- Add a local hook installer for commit-time enforcement.
- Add tests and fixtures for valid and invalid messages.

Verification:
- npm test passed.

AI-Agent: <agent-name> assisted with implementation and verification
Convention-Version: 2026-05-18
```

## Project Overrides

Projects may tighten or loosen the schema via `.commit-discipline.config.json`. CLI flags override config values.

### Config Fields

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

### CLI Flags

| Flag | Description |
|------|-------------|
| `--min-summary-lines N` | Override config `min_summary_lines` |
| `--max-summary-lines N` | Override config `max_summary_lines` |
| `--no-merge-commits` | Force validation of merge commit messages |
| `--no-revert-commits` | Force validation of revert commit messages |
| `--warn-only` | Output warnings instead of errors, exit 0 |
| `--json` | Output results as JSON |
| `--print-template` | Print the effective commit template |
| `--install-hook` | Install `commit-msg` hook |
| `--install-template-hook` | Install `prepare-commit-msg` hook |
| `--scan-staged` | Scan staged diff for secrets |
| `--version` | Print version |
