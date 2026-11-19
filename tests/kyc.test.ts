import { describe, expect, it } from "vitest";
import { decryptNik, encryptNik, kycCryptoConfigured, nikFingerprint } from "../server/lib/kyc-crypto";
import { isDigitalcoopKycComplete, maskNik, normalizeNik, validateKycInput, validateRejectNote } from "../shared/kyc";

const env = { KYC_ENCRYPTION_KEY: "ab".repeat(32) } as NodeJS.ProcessEnv;

describe("shared/kyc", () => {
  it("menormalkan dan memvalidasi NIK", () => {
    expect(normalizeNik("3174 0123-4567.8901")).toBe("3174012345678901");
    expect(validateKycInput({ nik: "123", fullName: "Budi" }).ok).toBe(false);
    expect(validateKycInput({ nik: "3174012345678901", fullName: "ab" }).ok).toBe(false);
    const v = validateKycInput({ nik: "3174012345678901", fullName: "  Budi   Santoso " });
    expect(v.ok && v.value.fullName).toBe("Budi Santoso");
  });
  it("menyamarkan NIK dan memeriksa alasan tolak", () => {
    expect(maskNik("3174012345678901")).toBe("3174********8901");
    expect(validateRejectNote("pendek").ok).toBe(false);
    expect(validateRejectNote("Foto KTP buram, unggah ulang").ok).toBe(true);
  });
  it("hanya status completed di digitalcoop.id yang lulus", () => {
    expect(isDigitalcoopKycComplete("completed")).toBe(true);
    expect(isDigitalcoopKycComplete("photos_uploaded")).toBe(false);
    expect(isDigitalcoopKycComplete(null)).toBe(false);
  });
});

describe("kyc-crypto", () => {
  it("enkripsi bolak-balik, acak per panggilan, dan tidak membocorkan NIK", () => {
    const a = encryptNik("3174012345678901", env), b = encryptNik("3174012345678901", env);
    expect(a).not.toBe(b);
    expect(a).not.toContain("3174");
    expect(decryptNik(a, env)).toBe("3174012345678901");
  });
  it("menolak kunci salah atau data diubah", () => {
    const a = encryptNik("3174012345678901", env);
    expect(() => decryptNik(a, { KYC_ENCRYPTION_KEY: "cd".repeat(32) } as NodeJS.ProcessEnv)).toThrow();
    expect(() => decryptNik(a.slice(0, -2) + "AA", env)).toThrow();
  });
  it("tanpa kunci valid: tidak terkonfigurasi", () => {
    expect(kycCryptoConfigured({} as NodeJS.ProcessEnv)).toBe(false);
    expect(kycCryptoConfigured({ KYC_ENCRYPTION_KEY: "xyz" } as NodeJS.ProcessEnv)).toBe(false);
    expect(() => encryptNik("1", {} as NodeJS.ProcessEnv)).toThrow();
  });
  it("sidik jari NIK stabil dan bergantung kunci", () => {
    expect(nikFingerprint("1", env)).toBe(nikFingerprint("1", env));
    expect(nikFingerprint("1", env)).not.toBe(nikFingerprint("1", { KYC_ENCRYPTION_KEY: "cd".repeat(32) } as NodeJS.ProcessEnv));
  });
});
