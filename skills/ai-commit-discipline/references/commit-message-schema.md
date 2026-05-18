# Commit Message Schema

This reference defines the reusable commit message schema enforced by `scripts/validate_commit_message.py`.

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
- python3 -m unittest discover -s tests passed.

AI-Agent: Codex assisted with implementation and verification
Convention-Version: 2026-05-18
```

## Project Overrides

Projects may tighten the schema without changing the skill:

- Increase `--min-summary-lines` when maintainers expect detailed commit bodies.
- Disable staged diff scanning when the repository already has a dedicated secret scanner.
- Add the validator to `commit-msg` hooks for local enforcement.
- Add the validator to CI for server-side enforcement.
