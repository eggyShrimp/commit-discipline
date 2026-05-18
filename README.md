# AI Commit Discipline

This repository packages a reusable skill for AI-assisted commits. The skill helps an agent turn code changes into small, reviewable commits with clear intent, visible impact, verification notes, and AI attribution.

The repository also includes a hard-check tool. Use the tool in a local `commit-msg` hook or in continuous integration to reject weak commit messages before they enter history.

## Contents

- `skills/ai-commit-discipline/SKILL.md` contains the agent workflow.
- `skills/ai-commit-discipline/scripts/validate_commit_message.py` validates commit messages and optional staged diffs.
- `skills/ai-commit-discipline/references/commit-message-schema.md` defines the reusable commit schema.
- `tests/` contains representative validator tests.

## Install The Skill

Copy `skills/ai-commit-discipline` into your agent skills directory, or publish this repository to a skill registry that accepts Agent Skills-style packages.

```bash
cp -R skills/ai-commit-discipline ~/.codex/skills/
```

## Use The Check Tool

Validate a commit message file:

```bash
python3 skills/ai-commit-discipline/scripts/validate_commit_message.py .git/COMMIT_EDITMSG
```

Install a local `commit-msg` hook:

```bash
python3 skills/ai-commit-discipline/scripts/validate_commit_message.py --install-hook
```

Use stricter summary length for projects that require detailed bodies:

```bash
python3 skills/ai-commit-discipline/scripts/validate_commit_message.py \
  --min-summary-lines 4 \
  --max-summary-lines 12 \
  .git/COMMIT_EDITMSG
```

## Validate This Repository

```bash
python3 -m unittest discover -s tests
python3 skills/ai-commit-discipline/scripts/validate_commit_message.py tests/fixtures/valid_commit.txt
```

## License

MIT
