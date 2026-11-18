import { describe, expect, it } from "vitest";
import {
  EXAM_MIN_QUESTIONS,
  contentMatchesModule,
  courseReadinessProblems,
  detectContentType,
  isEditableStatus,
  slugify,
  validateCourseInput,
  validateQuestionInput,
} from "../shared/course";

const goodCourse = { title: "Dasar Koperasi Digital", description: "Pengantar lengkap tentang tata kelola koperasi digital modern.", price: 0, type: "MANDIRI", categoryIds: [] };

describe("validateCourseInput", () => {
  it("menerima input wajar dan merapikan judul", () => {
    const r = validateCourseInput({ ...goodCourse, title: "  Dasar   Koperasi Digital " });
    expect(r.ok && r.value.title).toBe("Dasar Koperasi Digital");
  });
  it("menolak judul pendek, harga pecahan/negatif, tipe asing, dan kategori berlebih", () => {
    expect(validateCourseInput({ ...goodCourse, title: "abc" }).ok).toBe(false);
    expect(validateCourseInput({ ...goodCourse, price: 10.5 }).ok).toBe(false);
    expect(validateCourseInput({ ...goodCourse, price: -1 }).ok).toBe(false);
    expect(validateCourseInput({ ...goodCourse, type: "X" }).ok).toBe(false);
    expect(validateCourseInput({ ...goodCourse, categoryIds: ["a", "b", "c", "d"] }).ok).toBe(false);
  });
});

describe("validateQuestionInput", () => {
  const q = { question: "Apa itu koperasi?", options: ["A", "B", "C", "D"], correctIndex: 2 };
  it("menerima soal valid", () => expect(validateQuestionInput(q).ok).toBe(true));
  it("menolak pilihan kembar, jumlah salah, dan kunci di luar 0-3", () => {
    expect(validateQuestionInput({ ...q, options: ["A", "a", "C", "D"] }).ok).toBe(false);
    expect(validateQuestionInput({ ...q, options: ["A", "B", "C"] }).ok).toBe(false);
    expect(validateQuestionInput({ ...q, correctIndex: 4 }).ok).toBe(false);
  });
});

describe("courseReadinessProblems", () => {
  const ready = { title: "Dasar Koperasi", description: "x".repeat(40), modules: [{ type: "TEXT", hasContent: true }], examEnabled: true, questionCount: EXAM_MIN_QUESTIONS, licenseAccepted: true };
  it("kosong bila siap", () => expect(courseReadinessProblems(ready)).toEqual([]));
  it("melaporkan modul kosong, soal kurang, dan lisensi", () => {
    const p = courseReadinessProblems({ ...ready, modules: [{ type: "VIDEO", hasContent: false }], questionCount: 1, licenseAccepted: false });
    expect(p).toHaveLength(3);
  });
  it("ujian nonaktif tidak butuh soal", () => expect(courseReadinessProblems({ ...ready, examEnabled: false, questionCount: 0 })).toEqual([]));
});

describe("slugify dan status", () => {
  it("membuat slug aman", () => {
    expect(slugify("Kursus Ñandú & Koperasi!")).toBe("kursus-nandu-koperasi");
    expect(slugify("!!!")).toBe("kursus");
  });
  it("hanya DRAFT dan REJECTED yang dapat diubah", () => {
    expect(isEditableStatus("DRAFT")).toBe(true);
    expect(isEditableStatus("REJECTED")).toBe(true);
    expect(isEditableStatus("PENDING_REVIEW")).toBe(false);
    expect(isEditableStatus("PUBLISHED")).toBe(false);
  });
});

describe("detectContentType", () => {
  const bytes = (...b: number[]) => new Uint8Array(b);
  it("mengenali PDF, WebM, MP4", () => {
    expect(detectContentType(new TextEncoder().encode("%PDF-1.7"))?.ext).toBe("pdf");
    expect(detectContentType(bytes(0x1a, 0x45, 0xdf, 0xa3, 0))?.ext).toBe("webm");
    expect(detectContentType(new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode("ftypisom")]))?.ext).toBe("mp4");
  });
  it("menolak HTML/SVG/skrip dan berkas kosong", () => {
    expect(detectContentType(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectContentType(new Uint8Array())).toBeNull();
  });
  it("jenis harus cocok dengan modul", () => {
    const pdf = detectContentType(new TextEncoder().encode("%PDF-1.7"));
    expect(contentMatchesModule("PDF", pdf)).toBe(true);
    expect(contentMatchesModule("VIDEO", pdf)).toBe(false);
    expect(contentMatchesModule("TEXT", pdf)).toBe(false);
  });
});
