# Hook Setup

Use this reference only when the user asks to enable automatic commit-message enforcement in a target repository.

Installing the skill with `npx skills add` makes the skill available to the agent. It does not automatically modify `.git/hooks`.

## Enable Enforcement

From inside the target Git repository, run:

```bash
node <skill>/scripts/install-hook.mjs
```

The install script uses the bundled JavaScript validator that ships with the skill, then installs or updates the `commit-msg` hook.

## Existing Hooks

Before installing, check whether `.git/hooks/commit-msg` or the configured `core.hooksPath` already contains the `commit-discipline` block.

If a hook already exists, preserve the existing content and add only the `commit-discipline` block. If the block already exists, leave it in place unless the user asks to refresh it.

## Remove Enforcement

From inside the target Git repository, run:

```bash
node <skill>/dist/index.js --remove-hook
```
