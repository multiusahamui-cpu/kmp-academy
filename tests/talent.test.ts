import { describe, expect, it } from "vitest";
import { SLUG_RE, slugBase, validateInquiry, validateTalentProfile } from "../shared/talent";

const ok = { headline: "Calon Akuntan Koperasi", bio: "x".repeat(40), city: "Jakarta", skills: ["Excel", "excel", "Akuntansi"], linkedinUrl: "https://linkedin.com/in/a", portfolioUrl: "" };

describe("validateTalentProfile", () => {
  it("menerima input sah dan menghapus keahlian ganda tanpa peduli huruf besar", () => {
    const r = validateTalentProfile(ok);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.skills).toEqual(["Excel", "Akuntansi"]);
  });
  it("menolak tautan non-https, headline pendek, bio pendek", () => {
    expect(validateTalentProfile({ ...ok, linkedinUrl: "http://x.com" }).ok).toBe(false);
    expect(validateTalentProfile({ ...ok, headline: "abc" }).ok).toBe(false);
    expect(validateTalentProfile({ ...ok, bio: "pendek" }).ok).toBe(false);
  });
});

describe("validateInquiry", () => {
  const q = { senderName: "Budi HR", company: "PT Maju", senderEmail: "hr@maju.co.id", message: "Kami membuka posisi akuntan, tertarik?" };
  it("menerima pesan sah", () => expect(validateInquiry(q).ok).toBe(true));
  it("menolak email salah, pesan pendek, dan terlalu banyak tautan", () => {
    expect(validateInquiry({ ...q, senderEmail: "x" }).ok).toBe(false);
    expect(validateInquiry({ ...q, message: "halo" }).ok).toBe(false);
    expect(validateInquiry({ ...q, message: "https://a.com https://b.com https://c.com cek ini sekarang" }).ok).toBe(false);
  });
});

describe("slug", () => {
  it("menghasilkan slug aman", () => expect(SLUG_RE.test(slugBase("Dr. Ünal  Müller!"))).toBe(true));
});
