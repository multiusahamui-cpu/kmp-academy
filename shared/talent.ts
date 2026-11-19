// Industry Hub: profil talenta publik Student (opt-in, KYC terverifikasi, persetujuan PDP khusus).
export const TALENT_CONSENT_VERSION = "TALENT-PDP-2026-11";
export const TALENT_CONSENT_TEXT =
  "Saya setuju profil saya (nama, foto profil, headline, bio, kota, keahlian, tautan, daftar kursus yang diselesaikan, dan sertifikat beserta nilainya) ditampilkan secara publik di Industry Hub KMP-ADNG Academy agar dapat dilihat calon pemberi kerja. " +
  "NIK, foto KTP/selfie, email, dan nomor telepon saya tidak ditampilkan. Pesan dari calon pemberi kerja diteruskan ke inbox saya. Saya dapat menyembunyikan profil kapan saja.";

export const normalizeSkill = (s: string): string => s.trim().replace(/\s+/g, " ");
const isHttps = (v: string): boolean => { try { return new URL(v).protocol === "https:"; } catch { return false; } };
const clean = (v: unknown): string => String(v ?? "").trim().replace(/[ \t]+/g, " ");

export interface TalentInput { headline: string; bio: string; city: string; skills: string[]; linkedinUrl: string | null; portfolioUrl: string | null }

export const validateTalentProfile = (b: Record<string, unknown>): { ok: true; value: TalentInput } | { ok: false; message: string } => {
  const headline = clean(b.headline), bio = clean(b.bio), city = clean(b.city);
  if (headline.length < 5 || headline.length > 120) return { ok: false, message: "Headline 5-120 karakter (mis. Calon Akuntan Koperasi)." };
  if (bio.length < 30 || bio.length > 1000) return { ok: false, message: "Bio 30-1000 karakter." };
  if (city.length > 100) return { ok: false, message: "Kota maksimal 100 karakter." };
  const rawSkills = Array.isArray(b.skills) ? b.skills : String(b.skills ?? "").split(",");
  const seen = new Set<string>();
  const skills = rawSkills.map((s) => normalizeSkill(String(s))).filter((s) => { const k = s.toLowerCase(); if (!s || seen.has(k)) return false; seen.add(k); return true; });
  if (skills.length === 0 || skills.length > 12) return { ok: false, message: "Isi 1-12 keahlian." };
  if (skills.some((s) => s.length < 2 || s.length > 30)) return { ok: false, message: "Tiap keahlian 2-30 karakter." };
  const links: Record<string, string | null> = {};
  for (const k of ["linkedinUrl", "portfolioUrl"] as const) {
    const v = clean(b[k]);
    if (!v) { links[k] = null; continue; }
    if (v.length > 300 || !isHttps(v)) return { ok: false, message: "Tautan harus diawali https:// (maks 300 karakter)." };
    links[k] = v;
  }
  return { ok: true, value: { headline, bio, city, skills, linkedinUrl: links.linkedinUrl, portfolioUrl: links.portfolioUrl } };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const validateInquiry = (b: Record<string, unknown>): { ok: true; value: { senderName: string; company: string; senderEmail: string; message: string } } | { ok: false; message: string } => {
  const senderName = clean(b.senderName), company = clean(b.company), senderEmail = clean(b.senderEmail).toLowerCase(), message = clean(b.message);
  if (senderName.length < 3 || senderName.length > 100) return { ok: false, message: "Nama pengirim 3-100 karakter." };
  if (company.length < 2 || company.length > 120) return { ok: false, message: "Nama perusahaan 2-120 karakter." };
  if (!EMAIL_RE.test(senderEmail) || senderEmail.length > 200) return { ok: false, message: "Email tidak valid." };
  if (message.length < 20 || message.length > 1000) return { ok: false, message: "Pesan 20-1000 karakter." };
  if (/https?:\/\//i.test(message) && (message.match(/https?:\/\//gi) ?? []).length > 2) return { ok: false, message: "Pesan memuat terlalu banyak tautan." };
  return { ok: true, value: { senderName, company, senderEmail, message } };
};

export const slugBase = (name: string): string =>
  name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "talenta";
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
