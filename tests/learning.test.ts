import { describe, expect, it } from "vitest";
import {
  EXAM_GRACE_SECONDS, EXAM_MAX_ATTEMPTS, certificateKindFor, examDeadline, examEligibility, gradeExam, isPassing, isValidSerial,
  newCertificateSerial, normalizeSerial, progressPercent, shuffle, validateAnswers, withinSubmitWindow,
} from "../shared/learning";

const base = { courseType: "MANDIRI", examEnabled: true, progress: 100, attemptsUsed: 0, hasOpenAttempt: false, passed: false, questionCount: 10, minQuestions: 3 };

describe("progressPercent", () => {
  it("100 hanya bila semua modul selesai", () => {
    expect(progressPercent(0, 5)).toBe(0);
    expect(progressPercent(5, 5)).toBe(100);
    expect(progressPercent(199, 200)).toBe(99);
    expect(progressPercent(1, 500)).toBe(1);
    expect(progressPercent(2, 5)).toBe(40);
    expect(progressPercent(0, 0)).toBe(0);
  });
});

describe("certificateKindFor", () => {
  it("memilih jenis sertifikat menurut tipe kursus dan ujian", () => {
    expect(certificateKindFor("CERTIFICATION", true)).toBe("PARTICIPATION");
    expect(certificateKindFor("CERTIFICATION", false)).toBe("PARTICIPATION");
    expect(certificateKindFor("MANDIRI", true)).toBe("EXAM");
    expect(certificateKindFor("WORKSHOP", true)).toBe("EXAM");
    expect(certificateKindFor("MANDIRI", false)).toBe("COMPLETION");
  });
});

describe("examEligibility", () => {
  it("boleh ujian bila semua modul selesai dan masih ada kesempatan", () => {
    expect(examEligibility(base)).toEqual({ eligible: true, reason: null });
  });
  it("menolak bila modul belum selesai, kesempatan habis, atau sudah lulus", () => {
    expect(examEligibility({ ...base, progress: 99 }).eligible).toBe(false);
    expect(examEligibility({ ...base, attemptsUsed: EXAM_MAX_ATTEMPTS }).eligible).toBe(false);
    expect(examEligibility({ ...base, passed: true }).eligible).toBe(false);
  });
  it("kursus tanpa ujian atau sertifikasi tidak punya ujian", () => {
    expect(examEligibility({ ...base, examEnabled: false }).eligible).toBe(false);
    expect(examEligibility({ ...base, courseType: "CERTIFICATION" }).eligible).toBe(false);
  });
  it("percobaan yang sedang berjalan boleh dilanjutkan, soal kurang ditolak", () => {
    expect(examEligibility({ ...base, hasOpenAttempt: true, attemptsUsed: EXAM_MAX_ATTEMPTS }).eligible).toBe(true);
    expect(examEligibility({ ...base, questionCount: 2 }).eligible).toBe(false);
  });
});

describe("gradeExam", () => {
  const order = ["a", "b", "c", "d"];
  const key = { a: 0, b: 1, c: 2, d: 3 };
  it("menilai berdasarkan urutan soal", () => {
    expect(gradeExam(order, key, [0, 1, 2, 3])).toEqual({ correct: 4, total: 4, score: 100 });
    expect(gradeExam(order, key, [0, 1, 0, 0])).toEqual({ correct: 2, total: 4, score: 50 });
    expect(gradeExam(order, key, [-1, -1, -1, -1])).toEqual({ correct: 0, total: 4, score: 0 });
  });
  it("tidak membulatkan ke 100 bila ada yang salah", () => {
    const big = Array.from({ length: 200 }, (_, i) => `q${i}`);
    const k = Object.fromEntries(big.map((id) => [id, 0]));
    const ans = big.map((_, i) => (i === 0 ? 1 : 0));
    expect(gradeExam(big, k, ans).score).toBe(99);
  });
  it("nilai lulus inklusif", () => {
    expect(isPassing(70, 70)).toBe(true);
    expect(isPassing(69, 70)).toBe(false);
  });
});

describe("validateAnswers", () => {
  it("menerima hanya array sepanjang soal dengan bilangan -1..3", () => {
    expect(validateAnswers([0, 1, -1], 3)).toEqual([0, 1, -1]);
    expect(validateAnswers([0, 1], 3)).toBeNull();
    expect(validateAnswers([0, 4, 1], 3)).toBeNull();
    expect(validateAnswers([0, 1.5, 1], 3)).toBeNull();
    expect(validateAnswers("x", 3)).toBeNull();
    expect(validateAnswers([0, "1", 2], 3)).toBeNull();
  });
});

describe("waktu ujian", () => {
  it("diterima sampai batas ditambah toleransi", () => {
    const start = new Date("2026-11-19T10:00:00Z");
    const deadline = examDeadline(start, 60);
    expect(deadline.toISOString()).toBe("2026-11-19T11:00:00.000Z");
    expect(withinSubmitWindow(new Date("2026-11-19T11:00:00Z"), deadline)).toBe(true);
    expect(withinSubmitWindow(new Date(deadline.getTime() + EXAM_GRACE_SECONDS * 1000), deadline)).toBe(true);
    expect(withinSubmitWindow(new Date(deadline.getTime() + EXAM_GRACE_SECONDS * 1000 + 1), deadline)).toBe(false);
  });
});

describe("shuffle", () => {
  it("mempertahankan isi dan tidak mengubah sumber", () => {
    const src = [1, 2, 3, 4, 5];
    const out = shuffle(src, (max) => max - 1);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(src).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("nomor sertifikat", () => {
  it("berformat KMPA-tahun-8karakter dan valid", () => {
    const s = newCertificateSerial(2026, () => 0);
    expect(s).toBe("KMPA-2026-AAAAAAAA");
    expect(isValidSerial(s)).toBe(true);
    expect(isValidSerial("KMPA-2026-AAAAAAA0")).toBe(false);
    expect(isValidSerial("XXXX-2026-AAAAAAAA")).toBe(false);
    expect(normalizeSerial("  kmpa-2026-aaaaaaaa ")).toBe("KMPA-2026-AAAAAAAA");
  });
});
