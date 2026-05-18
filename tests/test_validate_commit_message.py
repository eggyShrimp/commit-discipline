from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "skills" / "ai-commit-discipline" / "scripts" / "validate_commit_message.py"
VALID = ROOT / "tests" / "fixtures" / "valid_commit.txt"
INVALID = ROOT / "tests" / "fixtures" / "invalid_commit.txt"


class ValidateCommitMessageTest(unittest.TestCase):
    def run_validator(self, *args: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            [sys.executable, str(SCRIPT), *args],
            cwd=ROOT,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

    def test_valid_fixture_passes(self) -> None:
        result = self.run_validator(str(VALID))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("passed", result.stdout)

    def test_invalid_fixture_fails(self) -> None:
        result = self.run_validator(str(INVALID))
        self.assertEqual(result.returncode, 1)
        self.assertIn("subject must match", result.stderr)
        self.assertIn("missing Summary", result.stderr)
        self.assertIn("missing Convention-Version", result.stderr)

    def test_strict_summary_count_passes(self) -> None:
        result = self.run_validator("--min-summary-lines", "4", str(VALID))
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_stdin_input_passes(self) -> None:
        result = subprocess.run(
            [sys.executable, str(SCRIPT)],
            cwd=ROOT,
            input=VALID.read_text(),
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_secret_scanner_flags_common_tokens(self) -> None:
        module_path = ROOT / "skills" / "ai-commit-discipline" / "scripts"
        sys.path.insert(0, str(module_path))
        try:
            from validate_commit_message import scan_text_for_secrets

            errors = scan_text_for_secrets("+ token = \"sk-abcdefghijklmnopqrstuvwxyz123456\"")
        finally:
            sys.path.remove(str(module_path))

        self.assertTrue(errors)


if __name__ == "__main__":
    unittest.main()
