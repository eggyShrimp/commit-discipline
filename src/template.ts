import { DEFAULT_TEMPLATE } from "./types.js";

export function getEffectiveTemplate(fileConfig: Record<string, unknown> | null): string {
  const custom = fileConfig?.template;
  if (typeof custom === "string" && custom.trim()) {
    return custom;
  }
  return DEFAULT_TEMPLATE;
}

export function printTemplate(template: string): void {
  process.stdout.write(template + "\n");
}
