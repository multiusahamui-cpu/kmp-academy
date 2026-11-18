import { describe, expect, it } from "vitest";
import { assertSafeKey, publicKeyFromUrl, readR2Config, resolveDriver } from "../server/lib/storage";
import { newAvatarKey } from "../server/lib/avatar";

const full = {
  R2_ACCOUNT_ID: "acc",
  R2_ACCESS_KEY_ID: "k",
  R2_SECRET_ACCESS_KEY: "s",
  R2_BUCKET_PUBLIC: "pub",
  R2_BUCKET_PRIVATE: "priv",
  R2_PUBLIC_URL_BASE: "https://cdn.example.id/",
};

describe("readR2Config", () => {
  it("null bila ada yang kosong; garis miring akhir dibuang; prefix dinormalkan", () => {
    expect(readR2Config({})).toBeNull();
    expect(readR2Config({ ...full, R2_BUCKET_PRIVATE: "" })).toBeNull();
    expect(readR2Config({ ...full, R2_PUBLIC_URL_BASE: "" })).toBeNull();
    expect(readR2Config(full)).toMatchObject({ publicUrlBase: "https://cdn.example.id", prefix: "" });
    expect(readR2Config({ ...full, R2_PREFIX_KEY: "/academy/" })?.prefix).toBe("academy/");
  });
});

describe("resolveDriver", () => {
  it("local bawaan; r2 hanya bila lengkap; r2 tidak lengkap = galat, bukan diam-diam local", () => {
    expect(resolveDriver({})).toBe("local");
    expect(resolveDriver({ STORAGE_DRIVER: "local", ...full })).toBe("local");
    expect(resolveDriver({ STORAGE_DRIVER: "r2", ...full })).toBe("r2");
    expect(() => resolveDriver({ STORAGE_DRIVER: "r2" })).toThrow();
  });
});

describe("assertSafeKey", () => {
  it("menerima kunci wajar, menolak traversal dan karakter aneh", () => {
    expect(assertSafeKey("avatars/u1-123.png")).toBe("avatars/u1-123.png");
    for (const bad of ["../x", "a/../b", "/abs", "a//b", "A/B", "a b", "a/", "", "a\\b"]) {
      expect(() => assertSafeKey(bad)).toThrow();
    }
  });
});

describe("publicKeyFromUrl", () => {
  const cfg = readR2Config({ ...full, R2_PREFIX_KEY: "academy" });
  it("mengambil kunci dari URL milik driver yang sama saja", () => {
    expect(publicKeyFromUrl("/cdn/avatars/a.png", "local", null)).toBe("avatars/a.png");
    expect(publicKeyFromUrl("https://cdn.example.id/academy/avatars/a.png", "r2", cfg)).toBe("avatars/a.png");
    expect(publicKeyFromUrl("https://lain.example/avatars/a.png", "r2", cfg)).toBeNull();
    expect(publicKeyFromUrl("/cdn/avatars/a.png", "r2", cfg)).toBeNull();
    expect(publicKeyFromUrl("https://cdn.example.id/academy/avatars/a.png", "local", null)).toBeNull();
  });
});

describe("newAvatarKey", () => {
  it("memakai id user dan folder avatars/", () => {
    const k = newAvatarKey("11111111-2222-3333-4444-555555555555", "webp", 1700000000000);
    expect(k).toBe("avatars/11111111-2222-3333-4444-555555555555-1700000000000.webp");
    expect(() => assertSafeKey(k)).not.toThrow();
  });
});
