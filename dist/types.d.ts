export declare const VERSION = "0.2.0";
export declare const CONFIG_FILENAME = ".commit-discipline.config.json";
export declare const ALLOWED_TYPES: Set<string>;
export declare const VAGUE_SUBJECTS: Set<string>;
export declare const AI_TRAILERS: readonly string[];
export declare const SECRET_PATTERNS: readonly RegExp[];
export interface ValidationConfig {
    scanStaged: boolean;
    allowMergeCommits: boolean;
    allowRevertCommits: boolean;
    warnOnly: boolean;
    outputJson: boolean;
    allowedScopes: string[] | null;
}
export declare const DEFAULT_CONFIG: ValidationConfig;
