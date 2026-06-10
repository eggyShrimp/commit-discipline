import { describe, it, expect } from "vitest";
import { scanTextForSecrets } from "../src/secrets.js";

describe("SecretScanner", () => {
  it("api key pattern", () => {
    expect(scanTextForSecrets('+ api_key = "sk-abcdefghijklmnopqrstuvwxyz123456"').length).toBeGreaterThan(0);
  });

  it("bearer token", () => {
    expect(scanTextForSecrets("Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.abc").length).toBeGreaterThan(0);
  });

  it("password in code", () => {
    expect(scanTextForSecrets('+ password = "supersecretpassword123"').length).toBeGreaterThan(0);
  });

  it("secret assignment", () => {
    expect(scanTextForSecrets('+ secret = "mysecretvalue12345678"').length).toBeGreaterThan(0);
  });

  it("clean text passes", () => {
    expect(scanTextForSecrets("+ x = 1\n+ y = 2")).toEqual([]);
  });

  it("short values ignored", () => {
    expect(scanTextForSecrets('+ api_key = "short"')).toEqual([]);
  });

  it("github PAT token", () => {
    expect(scanTextForSecrets("github_pat_11ABCDEFGHabcdefg1234567890ABCDEFGHabcdefg1234567890AB").length).toBeGreaterThan(0);
  });

  it("github OAuth token", () => {
    expect(scanTextForSecrets("ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefg").length).toBeGreaterThan(0);
  });

  it("AWS access key", () => {
    expect(scanTextForSecrets("+ AWS_ACCESS_KEY = 'AKIAIOSFODNN7EXAMPLE'").length).toBeGreaterThan(0);
  });

  it("JWT token", () => {
    expect(scanTextForSecrets("+ token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'").length).toBeGreaterThan(0);
  });

  it("private key", () => {
    expect(scanTextForSecrets("+ -----BEGIN RSA PRIVATE KEY-----").length).toBeGreaterThan(0);
  });
});
