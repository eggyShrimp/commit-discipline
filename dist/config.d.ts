import { type ValidationConfig } from "./types.js";
export interface ConfigResult {
    config: Record<string, unknown> | null;
    warnings: string[];
}
export declare function loadConfig(configPath?: string): ConfigResult;
export declare function applyConfig(fileConfig: Record<string, unknown> | null): ValidationConfig;
