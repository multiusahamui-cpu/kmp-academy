import { describe, expect, it } from "vitest";
import { aturanMasuk, bridgeConfigured, createBridge, type ProfilDigitalcoop } from "../server/lib/digitalcoop-bridge";

const profil = (o: Partial<ProfilDigitalcoop> = {}): ProfilDigitalcoop => ({
  digitalcoopUserId: "42",
  nama: "Budi",
  nomorAnggota: "KTA-1",
  email: "b@x.id",
  phone: "0812",
  kycStatus: "approved",
  wilayah: "Bekasi",
  statusAkun: "AKTIF",
  pekerja: true,
  contentCreator: false,
  bolehMasuk: true,
  ...o,
});
const env = { DIGITALCOOP_BRIDGE_URL: "http://127.0.0.1:5000/", DIGITALCOOP_BRIDGE_KEY: "k".repeat(40) } as NodeJS.ProcessEnv;

describe("aturanMasuk", () => {
  it("Student aktif boleh; akun tidak aktif / tanpa hak ditolak", () => {
    expect(aturanMasuk("STUDENT", profil()).ok).toBe(true);
    expect(aturanMasuk("STUDENT", profil({ statusAkun: "KELUAR" })).ok).toBe(false);
    expect(aturanMasuk("STUDENT", profil({ bolehMasuk: false })).ok).toBe(false);
  });
  it("Creator dibekukan bila content_creator dicabut", () => {
    expect(aturanMasuk("CREATOR", profil({ contentCreator: true })).ok).toBe(true);
    expect(aturanMasuk("CREATOR", profil({ contentCreator: false })).ok).toBe(false);
  });
});

describe("createBridge", () => {
  it("wajib dikonfigurasi (kunci ≥32 karakter)", async () => {
    expect(bridgeConfigured(env)).toBe(true);
    expect(bridgeConfigured({ ...env, DIGITALCOOP_BRIDGE_KEY: "pendek" })).toBe(false);
    await expect(createBridge({} as NodeJS.ProcessEnv).status("1")).rejects.toMatchObject({ status: 503 });
  });
  it("mengirim kunci di header dan memetakan galat", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const ok = createBridge(env, async (url, init) => {
      calls.push({ url, headers: init.headers });
      return { ok: true, status: 200, json: async () => ({ profil: profil() }) };
    });
    expect((await ok.tukarTiket("t".repeat(43))).nama).toBe("Budi");
    expect(calls[0].url).toBe("http://127.0.0.1:5000/api/bridge/academy/tukar");
    expect(calls[0].headers["X-Academy-Bridge-Key"]).toBe("k".repeat(40));
    const ditolak = createBridge(env, async () => ({ ok: false, status: 401, json: async () => ({ message: "Tiket kedaluwarsa" }) }));
    await expect(ditolak.tukarTiket("x")).rejects.toMatchObject({ status: 401, message: "Tiket kedaluwarsa" });
    const putus = createBridge(env, async () => {
      throw new Error("ECONNREFUSED");
    });
    await expect(putus.status("1")).rejects.toMatchObject({ status: 502 });
  });
});
