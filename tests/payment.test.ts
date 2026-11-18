import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { expiryFor, mapMidtransStatus, parseGrossAmount, validateManualDecision, validatePin, validateTopupAmount } from "../shared/payment";
import { createMidtrans, formatOrderTime, parseExpiry, verifyNotificationSignature } from "../server/lib/midtrans";
import { createBridge } from "../server/lib/digitalcoop-bridge";

describe("validateTopupAmount dan validatePin", () => {
  it("batas jumlah dan bilangan bulat", () => {
    expect(validateTopupAmount(50000).ok).toBe(true);
    expect(validateTopupAmount(9999).ok).toBe(false);
    expect(validateTopupAmount(20_000_001).ok).toBe(false);
    expect(validateTopupAmount(10000.5).ok).toBe(false);
    expect(validateTopupAmount("abc").ok).toBe(false);
  });
  it("PIN hanya angka 4-12 digit", () => {
    expect(validatePin("123456").ok).toBe(true);
    expect(validatePin("12a456").ok).toBe(false);
    expect(validatePin("123").ok).toBe(false);
    expect(validatePin(123456).ok).toBe(false);
  });
});

describe("validateManualDecision", () => {
  const ok = { decision: "APPROVE", paidAmount: 75000, paidDate: "2026-11-18", reference: "TRX12345", note: "" };
  it("persetujuan menuntut jumlah sama persis, tanggal tidak masa depan, referensi", () => {
    expect(validateManualDecision(ok, 75000, "2026-11-19").ok).toBe(true);
    expect(validateManualDecision({ ...ok, paidAmount: 74999 }, 75000, "2026-11-19").ok).toBe(false);
    expect(validateManualDecision({ ...ok, paidDate: "2026-11-20" }, 75000, "2026-11-19").ok).toBe(false);
    expect(validateManualDecision({ ...ok, paidDate: "18-11-2026" }, 75000, "2026-11-19").ok).toBe(false);
    expect(validateManualDecision({ ...ok, reference: "ab" }, 75000, "2026-11-19").ok).toBe(false);
  });
  it("penolakan menuntut catatan minimal 10 karakter", () => {
    expect(validateManualDecision({ decision: "REJECT", note: "buram" }, 1000, "2026-11-19").ok).toBe(false);
    expect(validateManualDecision({ decision: "REJECT", note: "Bukti tidak terbaca jelas" }, 1000, "2026-11-19").ok).toBe(true);
    expect(validateManualDecision({ decision: "X" }, 1000, "2026-11-19").ok).toBe(false);
  });
});

describe("midtrans helper", () => {
  it("parseGrossAmount hanya menerima rupiah bulat", () => {
    expect(parseGrossAmount("75000.00")).toBe(75000);
    expect(parseGrossAmount("75000")).toBe(75000);
    expect(parseGrossAmount(75000)).toBe(75000);
    expect(parseGrossAmount("75000.50")).toBeNull();
    expect(parseGrossAmount("-5")).toBeNull();
    expect(parseGrossAmount("abc")).toBeNull();
  });
  it("mapMidtransStatus", () => {
    expect(mapMidtransStatus("settlement")).toBe("PAID");
    expect(mapMidtransStatus("pending")).toBe("PENDING");
    for (const s of ["expire", "cancel", "deny", "failure"]) expect(mapMidtransStatus(s)).toBe("FAILED");
    expect(mapMidtransStatus("capture", "challenge")).toBe("PENDING");
  });
  it("tanda tangan notifikasi", () => {
    const body = { order_id: "o1", status_code: "200", gross_amount: "75000.00" };
    const sig = crypto.createHash("sha512").update("o120075000.00KUNCI-RAHASIA").digest("hex");
    expect(verifyNotificationSignature({ ...body, signature_key: sig }, "KUNCI-RAHASIA")).toBe(true);
    expect(verifyNotificationSignature({ ...body, signature_key: sig }, "KUNCI-LAIN")).toBe(false);
    expect(verifyNotificationSignature({ ...body, gross_amount: "1.00", signature_key: sig }, "KUNCI-RAHASIA")).toBe(false);
    expect(verifyNotificationSignature({ ...body }, "KUNCI-RAHASIA")).toBe(false);
  });
  it("format waktu WIB", () => {
    expect(formatOrderTime(new Date("2026-11-19T00:00:00Z"))).toBe("2026-11-19 07:00:00 +0700");
    expect(parseExpiry("2026-11-19 12:00:00", new Date(0)).toISOString()).toBe("2026-11-19T05:00:00.000Z");
    expect(parseExpiry("ngawur", new Date(5)).getTime()).toBe(5);
  });
  it("expiryFor: manual 48 jam, VA 24 jam", () => {
    const now = new Date("2026-11-19T00:00:00Z");
    expect(expiryFor("MANUAL", now).toISOString()).toBe("2026-11-21T00:00:00.000Z");
    expect(expiryFor("VA", now).toISOString()).toBe("2026-11-20T00:00:00.000Z");
  });
});

describe("createMidtrans.createVa", () => {
  const env = { MIDTRANS_SERVER_KEY: "SB-Mid-server-abc123456" } as unknown as NodeJS.ProcessEnv;
  it("mengirim charge bank_transfer dengan auth Basic dan membaca nomor VA", async () => {
    let seen: any = null;
    const m = createMidtrans(env, async (url, init) => {
      seen = { url, init };
      return { ok: true, status: 200, json: async () => ({ status_code: "201", transaction_status: "pending", va_numbers: [{ bank: "bca", va_number: "812345" }], expiry_time: "2026-11-20 07:00:00" }) };
    });
    const r = await m.createVa("11111111-1111-1111-1111-111111111111", 75000, "bca", new Date("2026-11-19T00:00:00Z"), 24, "Budi");
    expect(r.vaNumber).toBe("812345");
    expect(seen.url).toBe("https://api.sandbox.midtrans.com/v2/charge");
    expect(seen.init.headers.Authorization).toBe(`Basic ${Buffer.from("SB-Mid-server-abc123456:").toString("base64")}`);
    const body = JSON.parse(seen.init.body);
    expect(body).toMatchObject({ payment_type: "bank_transfer", bank_transfer: { bank: "bca" }, transaction_details: { gross_amount: 75000 } });
  });
  it("permata memakai payment_type permata", async () => {
    let body: any = null;
    const m = createMidtrans(env, async (_u, init) => { body = JSON.parse(init.body!); return { ok: true, status: 200, json: async () => ({ status_code: "201", permata_va_number: "998877" }) }; });
    const r = await m.createVa("o", 10000, "permata", new Date(), 24, "A");
    expect(r.vaNumber).toBe("998877");
    expect(body.payment_type).toBe("permata");
  });
  it("galat gateway menjadi MidtransError dan tanpa kunci ditolak", async () => {
    const bad = createMidtrans(env, async () => ({ ok: true, status: 200, json: async () => ({ status_code: "406", status_message: "Duplikat" }) }));
    await expect(bad.createVa("o", 10000, "bni", new Date(), 24, "A")).rejects.toThrow();
    const none = createMidtrans({} as NodeJS.ProcessEnv, async () => ({ ok: true, status: 200, json: async () => ({}) }));
    await expect(none.createVa("o", 10000, "bni", new Date(), 24, "A")).rejects.toThrow(/belum dikonfigurasi/);
  });
});

describe("bridge dompet", () => {
  const env = { DIGITALCOOP_BRIDGE_URL: "http://127.0.0.1:5000", DIGITALCOOP_BRIDGE_KEY: "k".repeat(32) } as unknown as NodeJS.ProcessEnv;
  it("debit mengirim kunci idempotensi dan PIN ke endpoint yang benar", async () => {
    let seen: any = null;
    const b = createBridge(env, async (url, init) => { seen = { url, init }; return { ok: true, status: 200, json: async () => ({ status: "SUCCESS", txId: "t1", saldoBaru: 5 }) }; });
    const r = await b.debit({ digitalcoopUserId: "u1", amount: 1000, pin: "123456", idempotencyKey: "ord-1", description: "x" });
    expect(r.txId).toBe("t1");
    expect(seen.url).toBe("http://127.0.0.1:5000/api/bridge/academy/debit");
    expect(JSON.parse(seen.init.body)).toMatchObject({ idempotencyKey: "ord-1", pin: "123456" });
  });
  it("galat PIN diteruskan dengan status dan pesan", async () => {
    const b = createBridge(env, async () => ({ ok: false, status: 400, json: async () => ({ message: "PIN salah. Sisa percobaan: 3", code: "PIN_REQUIRED" }) }));
    await expect(b.debit({ digitalcoopUserId: "u1", amount: 1000, pin: "000000", idempotencyKey: "o", description: "x" })).rejects.toMatchObject({ status: 400, code: "PIN_REQUIRED" });
  });
});
