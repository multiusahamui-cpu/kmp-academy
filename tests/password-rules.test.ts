import { describe, expect, it } from "vitest";
import { getConfigDefinition, validateConfigValue } from "@shared/system-config";

describe("aturan panjang password", () => {
  const def = getConfigDefinition("password_min_length")!;

  it("password_min_length menolak nilai di bawah batas keamanan", () => {
    expect(validateConfigValue(def, "3").ok).toBe(false);
    expect(validateConfigValue(def, "8").ok).toBe(true);
  });
});
