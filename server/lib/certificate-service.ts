import { eq, and, asc, isNull } from "drizzle-orm";
import { db } from "../db";
import { certificates, users } from "../schema/schema";
import { putPublic } from "./storage";
import { PdfPage, buildPdf, textWidth, wrapText } from "./pdf-lite";

// Sertifikat PDF disimpan di R2 PUBLIK (prefix certificates/); database hanya menyimpan URL-nya (kolom pdf_url).
// Isi sertifikat sama dengan yang tampil di verifikasi publik (nama, judul, tipe, nilai, tanggal), tanpa data sensitif.

type Cert = typeof certificates.$inferSelect;

export const certificateTitle = (courseType: string, kind: string): string =>
  courseType === "CERTIFICATION" ? "Sertifikat Keikutsertaan" : kind === "COMPLETION" ? "Sertifikat Penyelesaian" : "Sertifikat Kompetensi";

export const certificateBody = (courseType: string, kind: string, grade: number | null): string => {
  if (courseType === "CERTIFICATION") return "Telah mengikuti pelatihan persiapan sertifikasi profesi (Exam Preparation Course) yang diselenggarakan oleh KMP - ADNG Academy bekerjasama dengan Partner Resmi pada materi:";
  if (kind === "COMPLETION") return "Telah menyelesaikan seluruh materi pembelajaran pada KMP - ADNG Academy untuk kursus:";
  if (courseType === "WORKSHOP") return `Telah berhasil menyelesaikan Program Bootcamp / Workshop dan memenuhi standar penilaian akademik dengan predikat LULUS (Grade: ${grade ?? "-"}) pada materi:`;
  return `Telah berhasil menyelesaikan Kursus Mandiri dan memenuhi standar penilaian akademik dengan predikat LULUS (Grade: ${grade ?? "-"}) pada materi:`;
};

const longDate = (d: Date): string => d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" });

/** Menggambar sertifikat A4 lanskap. `director` = nama Direktur yang menjabat saat ini (kosong = hanya jabatan). */
export const renderCertificatePdf = (c: Pick<Cert, "serial" | "studentName" | "courseTitle" | "courseType" | "instructorName" | "grade" | "kind" | "issuedAt">, director: string | null): Buffer => {
  const W = 842, H = 595, cx = W / 2;
  const p = new PdfPage(W, H);
  p.color(0.09, 0.2, 0.36, true).rect(24, 24, W - 48, H - 48, 6).color(0.7, 0.72, 0.76, true).rect(36, 36, W - 72, H - 72, 1);
  p.color(0.09, 0.2, 0.36).centered("KMP - ADNG ACADEMY", cx, 520, "HB", 22);
  p.color(0.1, 0.1, 0.1).centered(certificateTitle(c.courseType, c.kind).toUpperCase(), cx, 470, "TB", 32);
  p.color(0.4, 0.4, 0.4).centered("Diberikan kepada:", cx, 432, "H", 13);
  let nameSize = 30;
  while (nameSize > 16 && textWidth(c.studentName, "TB", nameSize) > 640) nameSize -= 2;
  p.color(0, 0, 0).centered(c.studentName, cx, 398, "TB", nameSize);
  const nw = Math.min(textWidth(c.studentName, "TB", nameSize) + 40, 700);
  p.color(0.6, 0.6, 0.6, true).line(cx - nw / 2, 390, cx + nw / 2, 390, 1);
  let y = 362;
  p.color(0.3, 0.3, 0.3);
  for (const l of wrapText(certificateBody(c.courseType, c.kind, c.grade), "T", 13, 600)) { p.centered(l, cx, y, "T", 13); y -= 18; }
  y -= 8;
  p.color(0.09, 0.2, 0.36);
  for (const l of wrapText(c.courseTitle.toUpperCase(), "HB", 18, 640)) { p.centered(l, cx, y, "HB", 18); y -= 24; }
  // Tanda tangan
  const sy = 170;
  p.color(0.3, 0.3, 0.3).centered(`Jakarta, ${longDate(c.issuedAt)}`, 210, sy + 20, "H", 11);
  p.color(0.5, 0.5, 0.5, true).line(110, sy - 34, 310, sy - 34, 0.8).line(W - 310, sy - 34, W - 110, sy - 34, 0.8);
  p.color(0, 0, 0).centered(director ?? "Direktur", 210, sy - 48, "HB", 12).centered(c.instructorName, W - 210, sy - 48, "HB", 12);
  p.color(0.4, 0.4, 0.4).centered("DIREKTUR KMP-ADNG ACADEMY", 210, sy - 62, "HB", 8).centered(c.courseType === "WORKSHOP" ? "MENTOR / PENGAJAR" : c.courseType === "CERTIFICATION" ? "TRAINING PROVIDER" : "CONTENT CREATOR", W - 210, sy - 62, "HB", 8);
  if (c.courseType === "CERTIFICATION") p.color(0.5, 0.5, 0.5).centered("Sertifikat Kompetensi asli diterbitkan terpisah oleh Lembaga Sertifikasi Profesi (LSP) terkait setelah lulus ujian resmi.", cx, 70, "H", 8);
  p.color(0.5, 0.5, 0.5).text(`No. Sertifikat: ${c.serial}  |  Verifikasi: academy.digitalcoop.id/verify?no=${c.serial}`, 48, 44, "H", 8);
  return buildPdf(p, `${certificateTitle(c.courseType, c.kind)} ${c.serial}`);
};

export const currentDirectorName = async (): Promise<string | null> => {
  const [d] = await db.select({ name: users.name }).from(users).where(and(eq(users.role, "DIRECTOR"), eq(users.status, "ACTIVE"))).orderBy(asc(users.createdAt)).limit(1);
  return d?.name ?? null;
};

/** Membuat PDF sertifikat, mengunggahnya ke R2 publik, dan menyimpan URL-nya bila belum ada. Gagal = null (dicoba lagi nanti), tidak pernah melempar. */
export const ensureCertificatePdf = async (certId: string): Promise<string | null> => {
  try {
    const [c] = await db.select().from(certificates).where(eq(certificates.id, certId)).limit(1);
    if (!c) return null;
    if (c.pdfUrl) return c.pdfUrl;
    const bytes = renderCertificatePdf(c, await currentDirectorName());
    const url = await putPublic(`certificates/${c.serial.toLowerCase()}.pdf`, bytes, "application/pdf");
    const [done] = await db.update(certificates).set({ pdfUrl: url }).where(and(eq(certificates.id, c.id), isNull(certificates.pdfUrl))).returning({ pdfUrl: certificates.pdfUrl });
    return done?.pdfUrl ?? url;
  } catch (error) {
    console.error("[sertifikat] gagal membuat PDF", certId, error);
    return null;
  }
};
