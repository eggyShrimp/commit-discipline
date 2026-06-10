import { type ValidationConfig } from "./types.js";
export declare class CommitMessageValidator {
    private readonly config;
    constructor(config: ValidationConfig);
    validate(message: string): string[];
    validateSubject(subject: string): string[];
    validateRequiredField(lines: string[], label: string): string[];
    validateBulletedSection(lines: string[], label: string, minItems: number, maxItems: number): string[];
    validateAiTrailer(lines: string[]): string[];
    validateConventionVersion(lines: string[]): string[];
}
