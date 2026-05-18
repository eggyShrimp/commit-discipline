#!/usr/bin/env python3
"""Validate AI-assisted commit messages."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ALLOWED_TYPES = {
    "feat",
    "fix",
    "docs",
    "refactor",
    "test",
    "chore",
    "build",
    "ci",
    "perf",
    "style",
    "revert",
}

VAGUE_SUBJECTS = {
    "change",
    "changes",
    "fix",
    "misc",
    "modify",
    "stuff",
    "temp",
    "test",
    "update",
    "updates",
    "wip",
}

AI_TRAILERS = ("AI-Agent:", "AI-Generated:", "Co-developed-by:")
SECRET_PATTERNS = (
    re.compile(r"(?i)(api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*['\"][^'\"]{8,}['\"]"),
    re.compile(r"(?i)authorization:\s*bearer\s+[a-z0-9._~+/=-]{12,}"),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
)


@dataclass
class ValidationConfig:
    min_summary_lines: int = 1
    max_summary_lines: int = 12
    scan_staged: bool = False
    allow_merge_commits: bool = True


class CommitMessageValidator:
    def __init__(self, config: ValidationConfig) -> None:
        self.config = config

    def validate(self, message: str) -> list[str]:
        errors: list[str] = []
        normalized = message.replace("\r\n", "\n").strip()
        if not normalized:
            return ["commit message is empty"]

        lines = normalized.split("\n")
        subject = lines[0].strip()

        if self.config.allow_merge_commits and subject.startswith("Merge "):
            return []

        errors.extend(self._validate_subject(subject))
        errors.extend(self._validate_required_field(lines, "Why:"))
        errors.extend(self._validate_required_field(lines, "Impact:"))
        errors.extend(self._validate_bulleted_section(lines, "Summary:", self.config.min_summary_lines, self.config.max_summary_lines))
        errors.extend(self._validate_bulleted_section(lines, "Verification:", 1, 12))
        errors.extend(self._validate_ai_trailer(lines))
        errors.extend(self._validate_convention_version(lines))

        return errors

    def _validate_subject(self, subject: str) -> list[str]:
        errors: list[str] = []
        pattern = r"^(?P<type>[a-z]+)(?:\((?P<scope>[a-z0-9._/-]+)\))?: (?P<text>.+)$"
        match = re.match(pattern, subject)
        if not match:
            return ["subject must match '<type>(<scope>): <subject>' or '<type>: <subject>'"]

        commit_type = match.group("type")
        text = match.group("text").strip()

        if commit_type not in ALLOWED_TYPES:
            errors.append(f"unsupported commit type '{commit_type}'")
        if not text:
            errors.append("subject text is empty")
        if text.lower().strip(".") in VAGUE_SUBJECTS:
            errors.append("subject is too vague")
        if len(subject) > 100:
            errors.append("subject should be 100 characters or fewer")
        if text.endswith("."):
            errors.append("subject should not end with a period")

        return errors

    def _validate_required_field(self, lines: list[str], label: str) -> list[str]:
        for line in lines:
            if line.startswith(label):
                value = line[len(label) :].strip()
                if value:
                    return []
                return [f"{label} must include a value"]
        return [f"missing {label}"]

    def _validate_bulleted_section(
        self,
        lines: list[str],
        label: str,
        min_items: int,
        max_items: int,
    ) -> list[str]:
        try:
            start = lines.index(label)
        except ValueError:
            return [f"missing {label} section"]

        items: list[str] = []
        for line in lines[start + 1 :]:
            stripped = line.strip()
            if not stripped:
                if items:
                    break
                continue
            if re.match(r"^[A-Za-z-]+:", stripped):
                break
            if stripped.startswith("- "):
                items.append(stripped[2:].strip())
            else:
                return [f"{label} section must use '- ' bullet lines"]

        errors: list[str] = []
        if len(items) < min_items:
            errors.append(f"{label} section needs at least {min_items} bullet(s)")
        if len(items) > max_items:
            errors.append(f"{label} section allows at most {max_items} bullet(s)")
        if any(not item for item in items):
            errors.append(f"{label} section contains an empty bullet")
        return errors

    def _validate_ai_trailer(self, lines: list[str]) -> list[str]:
        found = [line for line in lines if line.startswith(AI_TRAILERS)]
        if not found:
            return ["missing AI attribution trailer"]
        if len(found) > 1:
            return ["use exactly one AI attribution trailer"]
        trailer = found[0]
        value = trailer.split(":", 1)[1].strip()
        if not value:
            return ["AI attribution trailer must include a value"]
        return []

    def _validate_convention_version(self, lines: list[str]) -> list[str]:
        matches = [line for line in lines if line.startswith("Convention-Version:")]
        if not matches:
            return ["missing Convention-Version trailer"]
        if len(matches) > 1:
            return ["use exactly one Convention-Version trailer"]
        value = matches[0].split(":", 1)[1].strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
            return ["Convention-Version must use YYYY-MM-DD"]
        return []


def scan_text_for_secrets(text: str) -> list[str]:
    errors: list[str] = []
    for index, pattern in enumerate(SECRET_PATTERNS, start=1):
        if pattern.search(text):
            errors.append(f"staged diff matched sensitive-value pattern {index}")
    return errors


def staged_diff() -> str:
    result = subprocess.run(
        ["git", "diff", "--cached", "--"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "failed to read staged diff")
    return result.stdout


def install_hook(script_path: Path) -> None:
    git_dir = subprocess.run(
        ["git", "rev-parse", "--git-dir"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if git_dir.returncode != 0:
        raise RuntimeError("not inside a git repository")

    hook_path = Path(git_dir.stdout.strip()) / "hooks" / "commit-msg"
    hook_path.parent.mkdir(parents=True, exist_ok=True)
    hook = f"""#!/bin/sh
python3 "{script_path}" --scan-staged "$1"
"""
    hook_path.write_text(hook)
    hook_path.chmod(hook_path.stat().st_mode | 0o111)
    print(f"installed commit-msg hook: {hook_path}")


def read_message(path: str | None) -> str:
    if path:
        return Path(path).read_text()
    return sys.stdin.read()


def format_errors(errors: Iterable[str]) -> str:
    return "\n".join(f"- {error}" for error in errors)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Validate AI-assisted commit messages.")
    parser.add_argument("message_file", nargs="?", help="Commit message file. Reads stdin when omitted.")
    parser.add_argument("--min-summary-lines", type=int, default=1)
    parser.add_argument("--max-summary-lines", type=int, default=12)
    parser.add_argument("--scan-staged", action="store_true", help="Scan staged diff for obvious sensitive values.")
    parser.add_argument("--install-hook", action="store_true", help="Install this validator as the repository commit-msg hook.")
    parser.add_argument("--no-merge-commits", action="store_true", help="Validate merge commit messages instead of allowing them.")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    script_path = Path(__file__).resolve()

    if args.install_hook:
        try:
            install_hook(script_path)
            return 0
        except RuntimeError as exc:
            print(f"error: {exc}", file=sys.stderr)
            return 2

    if args.min_summary_lines < 0:
        print("error: --min-summary-lines must be >= 0", file=sys.stderr)
        return 2
    if args.max_summary_lines < args.min_summary_lines:
        print("error: --max-summary-lines must be >= --min-summary-lines", file=sys.stderr)
        return 2

    config = ValidationConfig(
        min_summary_lines=args.min_summary_lines,
        max_summary_lines=args.max_summary_lines,
        scan_staged=args.scan_staged,
        allow_merge_commits=not args.no_merge_commits,
    )

    try:
        message = read_message(args.message_file)
    except OSError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    errors = CommitMessageValidator(config).validate(message)

    if config.scan_staged:
        try:
            errors.extend(scan_text_for_secrets(staged_diff()))
        except RuntimeError as exc:
            errors.append(str(exc))

    if errors:
        print("commit message failed validation:", file=sys.stderr)
        print(format_errors(errors), file=sys.stderr)
        return 1

    print("commit message passed validation")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
