import { describe, expect, it } from "vitest";
import { nextStatus, validateMessage, validateNewTicket } from "../shared/helpdesk";

describe("validateNewTicket", () => {
  it("menerima tiket sah dan merapikan spasi", () => {
    expect(validateNewTicket({ subject: "  Tidak bisa login ", category: "AKUN", body: " Lupa sandi " })).toEqual({ ok: true, value: { subject: "Tidak bisa login", category: "AKUN", body: "Lupa sandi" } });
  });
  it("menolak judul pendek, kategori asing, pesan kosong, dan masukan bukan objek", () => {
    expect(validateNewTicket({ subject: "x", category: "AKUN", body: "halo bantuan" }).ok).toBe(false);
    expect(validateNewTicket({ subject: "Judul sah", category: "XX", body: "halo bantuan" }).ok).toBe(false);
    expect(validateNewTicket({ subject: "Judul sah", category: "AKUN", body: "  " }).ok).toBe(false);
    expect(validateNewTicket({ subject: "Judul sah", category: "AKUN", body: "x".repeat(4001) }).ok).toBe(false);
    expect(validateNewTicket(null).ok).toBe(false);
  });
});

describe("validateMessage & nextStatus", () => {
  it("memvalidasi isi pesan", () => {
    expect(validateMessage({ body: " Terima kasih " })).toEqual({ ok: true, value: "Terima kasih" });
    expect(validateMessage({ body: "hi" }).ok).toBe(false);
    expect(validateMessage(undefined).ok).toBe(false);
  });
  it("balasan staf -> ANSWERED, balasan pemilik -> OPEN, tertutup menolak", () => {
    expect(nextStatus("OPEN", true)).toBe("ANSWERED");
    expect(nextStatus("ANSWERED", false)).toBe("OPEN");
    expect(nextStatus("CLOSED", true)).toBeNull();
  });
});
