import { describe, it, expect } from "vitest";
import { CommitMessageValidator } from "../src/validate.js";
import { DEFAULT_CONFIG } from "../src/types.js";

function makeMsg(...lines: string[]): string {
  return lines.join("\n");
}

function wrapSubject(subject: string): string {
  return makeMsg(
    subject,
    "",
    "Why: reason",
    "Impact: something",
    "",
    "Summary:",
    "- a change",
    "",
    "Verification:",
    "- ran tests",
    "",
    "AI-Agent: Codex assisted",
    "Convention-Version: 2026-01-01",
  );
}

describe("SubjectValidation", () => {
  const v = new CommitMessageValidator(DEFAULT_CONFIG);

  it("valid type only", () => {
    expect(v.validate(wrapSubject("feat: add button"))).toEqual([]);
  });

  it("valid type and scope", () => {
    expect(v.validate(wrapSubject("fix(auth): fix login"))).toEqual([]);
  });

  it("valid scope with dots", () => {
    expect(v.validate(wrapSubject("refactor(core.utils): extract helpers"))).toEqual([]);
  });

  it("valid scope with slash", () => {
    expect(v.validate(wrapSubject("test(src/lib): add unit tests"))).toEqual([]);
  });

  it("vague subject 'changes'", () => {
    const errors = v.validate(wrapSubject("chore: changes"));
    expect(errors.some((e) => e.includes("too vague"))).toBe(true);
  });

  it("vague subject 'update'", () => {
    const errors = v.validate(wrapSubject("chore: update"));
    expect(errors.some((e) => e.includes("too vague"))).toBe(true);
  });

  it("vague subject 'wip'", () => {
    const errors = v.validate(wrapSubject("feat: wip"));
    expect(errors.some((e) => e.includes("too vague"))).toBe(true);
  });

  it("vague subject ignores case", () => {
    const errors = v.validate(wrapSubject("chore: STUFF"));
    expect(errors.some((e) => e.includes("too vague"))).toBe(true);
  });

  it("trailing period rejected", () => {
    const errors = v.validate(wrapSubject("feat: add button."));
    expect(errors.some((e) => e.includes("period"))).toBe(true);
  });

  it("no trailing period accepted", () => {
    expect(v.validate(wrapSubject("feat: add button"))).toEqual([]);
  });

  it("subject too long", () => {
    const longText = "feat: " + "a".repeat(100);
    const errors = v.validate(wrapSubject(longText));
    expect(errors.some((e) => e.includes("100 characters"))).toBe(true);
  });

  it("subject exactly 100 chars", () => {
    const subject = "feat: " + "a".repeat(94);
    expect(subject.length).toBe(100);
    const errors = v.validate(wrapSubject(subject));
    expect(errors.some((e) => e.includes("100 characters"))).toBe(false);
  });

  it("invalid type", () => {
    const errors = v.validate(wrapSubject("yolo: did stuff"));
    expect(errors.some((e) => e.includes("unsupported commit type"))).toBe(true);
  });

  it("invalid type uppercase", () => {
    const errors = v.validate(wrapSubject("Feat: add button"));
    expect(errors.some((e) => e.includes("subject must match"))).toBe(true);
  });

  it("empty subject text after colon", () => {
    const errors = v.validate(wrapSubject("feat:"));
    expect(errors.some((e) => e.includes("subject must match"))).toBe(true);
  });

  it("missing subject format", () => {
    const errors = v.validate(wrapSubject("not a valid subject"));
    expect(errors.some((e) => e.includes("subject must match"))).toBe(true);
  });

  it("all allowed types", () => {
    const types = ["feat", "fix", "docs", "refactor", "test", "chore", "build", "ci", "perf", "style", "revert"];
    for (const t of types) {
      const errors = v.validate(wrapSubject(`${t}: something`));
      const typeErrors = errors.filter((e) => e.includes("unsupported commit type"));
      expect(typeErrors).toEqual([]);
    }
  });
});

describe("RequiredFields", () => {
  const v = new CommitMessageValidator(DEFAULT_CONFIG);

  it("missing Why:", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("missing Why:"))).toBe(true);
  });

  it("empty Why:", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why:",
      "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("Why:") && e.includes("value"))).toBe(true);
  });

  it("missing Impact:", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("missing Impact:"))).toBe(true);
  });

  it("empty Impact:", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason",
      "Impact:", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("Impact:") && e.includes("value"))).toBe(true);
  });
});

describe("BulletedSections", () => {
  it("max summary lines exceeded", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, maxSummaryLines: 2 });
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "- b", "- c", "",
      "Verification:", "- d", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("at most 2"))).toBe(true);
  });

  it("min summary lines not met", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, minSummaryLines: 3 });
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- d", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("at least 3"))).toBe(true);
  });

  it("summary with exact max", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, maxSummaryLines: 2 });
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "- b", "",
      "Verification:", "- d", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    const errors = v.validate(msg);
    const countErrors = errors.filter((e) => e.includes("at most") || e.includes("at least"));
    expect(countErrors).toEqual([]);
  });

  it("summary with blank separator before bullets", () => {
    const v = new CommitMessageValidator(DEFAULT_CONFIG);
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "",
      "- a", "",
      "Verification:", "- d", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg)).toEqual([]);
  });

  it("missing summary section", () => {
    const v = new CommitMessageValidator(DEFAULT_CONFIG);
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Verification:", "- d", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("missing Summary:"))).toBe(true);
  });

  it("missing verification section", () => {
    const v = new CommitMessageValidator(DEFAULT_CONFIG);
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("missing Verification:"))).toBe(true);
  });

  it("non-bullet line in summary", () => {
    const v = new CommitMessageValidator(DEFAULT_CONFIG);
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "not a bullet", "",
      "Verification:", "- d", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("must use '- '"))).toBe(true);
  });

  it("empty bullet in summary", () => {
    const v = new CommitMessageValidator(DEFAULT_CONFIG);
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "- ", "",
      "Verification:", "- d", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("empty bullet"))).toBe(true);
  });
});

describe("ConventionVersion", () => {
  const v = new CommitMessageValidator(DEFAULT_CONFIG);

  it("missing convention version", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
    );
    expect(v.validate(msg).some((e) => e.includes("missing Convention-Version"))).toBe(true);
  });

  it("duplicate convention version", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
      "Convention-Version: 2026-02-02",
    );
    expect(v.validate(msg).some((e) => e.includes("exactly one"))).toBe(true);
  });

  it("invalid date format", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 01-01-2026",
    );
    expect(v.validate(msg).some((e) => e.includes("YYYY-MM-DD"))).toBe(true);
  });

  it("non-date value", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: v1.0",
    );
    expect(v.validate(msg).some((e) => e.includes("YYYY-MM-DD"))).toBe(true);
  });
});

describe("AITrailer", () => {
  const v = new CommitMessageValidator(DEFAULT_CONFIG);

  it("missing trailer", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("missing AI attribution"))).toBe(true);
  });

  it("duplicate trailers", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent: Codex assisted",
      "AI-Generated: Codex",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("exactly one"))).toBe(true);
  });

  it("empty trailer value", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Agent:",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("must include a value"))).toBe(true);
  });

  it("AI-Generated trailer accepted", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "AI-Generated: Codex",
      "Convention-Version: 2026-01-01",
    );
    const errors = v.validate(msg);
    expect(errors.filter((e) => e.toLowerCase().includes("attribution"))).toEqual([]);
  });

  it("Co-developed-by trailer accepted", () => {
    const msg = makeMsg(
      "feat: x", "",
      "Why: reason", "Impact: something", "",
      "Summary:", "- a", "",
      "Verification:", "- b", "",
      "Co-developed-by: Codex",
      "Convention-Version: 2026-01-01",
    );
    const errors = v.validate(msg);
    expect(errors.filter((e) => e.toLowerCase().includes("attribution"))).toEqual([]);
  });
});

describe("MergeCommit", () => {
  it("skipped by default", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, allowMergeCommits: true });
    expect(v.validate("Merge branch 'main' into feature")).toEqual([]);
  });

  it("validated when disabled", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, allowMergeCommits: false });
    expect(v.validate("Merge branch 'main' into feature").length).toBeGreaterThan(0);
  });
});

describe("RevertCommit", () => {
  it("skipped by default", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, allowRevertCommits: true });
    expect(v.validate('Revert "feat(api): add endpoint"\n\nThis reverts commit abc123.')).toEqual([]);
  });

  it("validated when disabled", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, allowRevertCommits: false });
    expect(v.validate('Revert "feat(api): add endpoint"\n\nThis reverts commit abc123.').length).toBeGreaterThan(0);
  });

  it("revert scope message passes when revert allowed", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, allowRevertCommits: true });
    const msg = makeMsg(
      "revert(api): remove broken endpoint",
      "",
      "Why: endpoint causes 500 errors",
      "Impact: users no longer hit the broken route",
      "",
      "Summary:",
      "- remove /api/broken",
      "",
      "Verification:",
      "- ran tests",
      "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg)).toEqual([]);
  });
});

describe("EmptyMessage", () => {
  const v = new CommitMessageValidator(DEFAULT_CONFIG);

  it("empty string", () => {
    expect(v.validate("").some((e) => e.includes("empty"))).toBe(true);
  });

  it("whitespace only", () => {
    expect(v.validate("   \n\n  ").some((e) => e.includes("empty"))).toBe(true);
  });
});

describe("ScopeWhitelist", () => {
  it("scope allowed", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, allowedScopes: ["core", "api"] });
    const msg = makeMsg(
      "feat(api): add endpoint", "",
      "Why: need it", "Impact: users see it", "",
      "Summary:", "- add", "",
      "Verification:", "- ran tests", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg)).toEqual([]);
  });

  it("scope rejected", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, allowedScopes: ["core", "api"] });
    const msg = makeMsg(
      "feat(ui): add button", "",
      "Why: need it", "Impact: users see it", "",
      "Summary:", "- add", "",
      "Verification:", "- ran tests", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg).some((e) => e.includes("not in the allowed list"))).toBe(true);
  });

  it("scope omitted passes", () => {
    const v = new CommitMessageValidator({ ...DEFAULT_CONFIG, allowedScopes: ["core", "api"] });
    const msg = makeMsg(
      "feat: add button", "",
      "Why: need it", "Impact: users see it", "",
      "Summary:", "- add", "",
      "Verification:", "- ran tests", "",
      "AI-Agent: Codex assisted",
      "Convention-Version: 2026-01-01",
    );
    expect(v.validate(msg)).toEqual([]);
  });
});
