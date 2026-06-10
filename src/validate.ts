import { ALLOWED_TYPES, VAGUE_SUBJECTS, AI_TRAILERS, type ValidationConfig } from "./types.js";

const SUBJECT_PATTERN = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9._/-]+)\))?: (?<text>.+)$/;

export class CommitMessageValidator {
  constructor(private readonly config: ValidationConfig) {}

  validate(message: string): string[] {
    const normalized = message.replace(/\r\n/g, "\n").trim();
    if (!normalized) {
      return ["commit message is empty"];
    }

    const lines = normalized.split("\n");
    const subject = lines[0].trim();

    if (this.config.allowMergeCommits && subject.startsWith("Merge ")) {
      return [];
    }

    if (this.config.allowRevertCommits && subject.startsWith("Revert ")) {
      return [];
    }

    const errors: string[] = [];
    errors.push(...this.validateSubject(subject));
    errors.push(...this.validateRequiredField(lines, "Why:"));
    errors.push(...this.validateRequiredField(lines, "Impact:"));
    errors.push(
      ...this.validateBulletedSection(lines, "Summary:", this.config.minSummaryLines, this.config.maxSummaryLines),
    );
    errors.push(...this.validateBulletedSection(lines, "Verification:", 1, 12));
    errors.push(...this.validateAiTrailer(lines));
    errors.push(...this.validateConventionVersion(lines));

    return errors;
  }

  validateSubject(subject: string): string[] {
    const errors: string[] = [];
    const match = SUBJECT_PATTERN.exec(subject);
    if (!match) {
      return ["subject must match '<type>(<scope>): <subject>' or '<type>: <subject>'"];
    }

    const commitType = match.groups!.type;
    const scope = match.groups!.scope;
    const text = match.groups!.text.trim();

    if (!ALLOWED_TYPES.has(commitType)) {
      errors.push(`unsupported commit type '${commitType}'`);
    }
    if (scope && this.config.allowedScopes && !this.config.allowedScopes.includes(scope)) {
      const allowed = this.config.allowedScopes.join(", ");
      errors.push(`scope '${scope}' is not in the allowed list (${allowed})`);
    }
    if (!text) {
      errors.push("subject text is empty");
    }
    if (VAGUE_SUBJECTS.has(text.toLowerCase().replace(/\.$/, ""))) {
      errors.push("subject is too vague");
    }
    if (subject.length > 100) {
      errors.push("subject should be 100 characters or fewer");
    }
    if (text.endsWith(".")) {
      errors.push("subject should not end with a period");
    }

    return errors;
  }

  validateRequiredField(lines: string[], label: string): string[] {
    for (const line of lines) {
      if (line.startsWith(label)) {
        const value = line.slice(label.length).trim();
        if (value) {
          return [];
        }
        return [`${label} must include a value`];
      }
    }
    return [`missing ${label}`];
  }

  validateBulletedSection(
    lines: string[],
    label: string,
    minItems: number,
    maxItems: number,
  ): string[] {
    const start = lines.indexOf(label);
    if (start === -1) {
      return [`missing ${label} section`];
    }

    const items: string[] = [];
    for (const line of lines.slice(start + 1)) {
      const stripped = line.trim();
      if (!stripped) {
        if (items.length > 0) break;
        continue;
      }
      if (/^[A-Za-z-]+:/.test(stripped)) {
        break;
      }
      if (stripped === "-") {
        items.push("");
      } else if (stripped.startsWith("- ")) {
        items.push(stripped.slice(2).trim());
      } else {
        return [`${label} section must use '- ' bullet lines`];
      }
    }

    const errors: string[] = [];
    if (items.length < minItems) {
      errors.push(`${label} section needs at least ${minItems} bullet(s)`);
    }
    if (items.length > maxItems) {
      errors.push(`${label} section allows at most ${maxItems} bullet(s)`);
    }
    if (items.some((item) => !item)) {
      errors.push(`${label} section contains an empty bullet`);
    }
    return errors;
  }

  validateAiTrailer(lines: string[]): string[] {
    const found = lines.filter((line) => AI_TRAILERS.some((t) => line.startsWith(t)));
    if (found.length === 0) {
      return ["missing AI attribution trailer"];
    }
    if (found.length > 1) {
      return ["use exactly one AI attribution trailer"];
    }
    const trailer = found[0];
    const value = trailer.split(":", 2)[1]?.trim();
    if (!value) {
      return ["AI attribution trailer must include a value"];
    }
    return [];
  }

  validateConventionVersion(lines: string[]): string[] {
    const matches = lines.filter((line) => line.startsWith("Convention-Version:"));
    if (matches.length === 0) {
      return ["missing Convention-Version trailer"];
    }
    if (matches.length > 1) {
      return ["use exactly one Convention-Version trailer"];
    }
    const value = matches[0].split(":", 2)[1]?.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return ["Convention-Version must use YYYY-MM-DD"];
    }
    return [];
  }
}
