// Jembatan identitas digitalcoop.id (server-ke-server). digitalcoop.id = sumber kebenaran identitas & role.
// Endpoint di digitalcoop.id: server/routes/academy-bridge.ts (repo garuda-superapp).
//   DIGITALCOOP_BRIDGE_URL  mis. http://127.0.0.1:5000 (satu server; tidak lewat internet)
//   DIGITALCOOP_BRIDGE_KEY  = ACADEMY_BRIDGE_KEY di .env digitalcoop.id (min. 32 karakter)

export interface ProfilDigitalcoop {
  digitalcoopUserId: string;
  nama: string;
  nomorAnggota: string | null;
  email: string | null;
  phone: string | null;
  kycStatus: string;
  wilayah: string | null;
  statusAkun: "AKTIF" | "DIBLOKIR" | "DITUTUP" | "KELUAR";
  pekerja: boolean;
  contentCreator: boolean;
  bolehMasuk: boolean;
}

export class BridgeError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "BridgeError";
  }
}

export const DIGITALCOOP_URL = "https://digitalcoop.id";
export const CONSENT_VERSION = "ACD-PDP-2026-11";
export const ONBOARDING_TTL_MS = 15 * 60_000;

export const bridgeConfigured = (env: NodeJS.ProcessEnv = process.env): boolean =>
  Boolean(env.DIGITALCOOP_BRIDGE_URL && env.DIGITALCOOP_BRIDGE_KEY && env.DIGITALCOOP_BRIDGE_KEY.length >= 32);

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export const createBridge = (env: NodeJS.ProcessEnv = process.env, fetchImpl: FetchLike = fetch as unknown as FetchLike) => {
  const call = async <T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> => {
    if (!bridgeConfigured(env)) throw new BridgeError(503, "Jembatan digitalcoop.id belum dikonfigurasi.");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetchImpl(`${String(env.DIGITALCOOP_BRIDGE_URL).replace(/\/+$/, "")}${path}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Academy-Bridge-Key": String(env.DIGITALCOOP_BRIDGE_KEY) },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      });
      const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new BridgeError(res.status, String(data.message ?? "Gagal menghubungi digitalcoop.id."), data.code as string | undefined);
      return data as T;
    } catch (err) {
      if (err instanceof BridgeError) throw err;
      throw new BridgeError(502, "digitalcoop.id tidak dapat dihubungi. Coba lagi sebentar.");
    } finally {
      clearTimeout(timer);
    }
  };
  return {
    tukarTiket: async (tiket: string) => (await call<{ profil: ProfilDigitalcoop }>("POST", "/api/bridge/academy/tukar", { tiket })).profil,
    verifikasiPassword: async (digitalcoopUserId: string, password: string) =>
      (await call<{ cocok: boolean }>("POST", "/api/bridge/academy/verifikasi-password", { digitalcoopUserId, password })).cocok,
    status: async (digitalcoopUserId: string) =>
      (await call<{ profil: ProfilDigitalcoop }>("GET", `/api/bridge/academy/status/${encodeURIComponent(digitalcoopUserId)}`)).profil,
  };
};

export const bridge = createBridge();

/**
 * Aturan masuk untuk akun tertaut (murni, mudah diuji). Pekerja dicabut / akun digitalcoop tidak aktif → ditolak;
 * akun Creator yang role content_creator-nya dicabut/dibekukan → dibekukan (ditolak masuk sampai diurus admin).
 */
export const aturanMasuk = (role: string, p: ProfilDigitalcoop): { ok: true } | { ok: false; message: string } => {
  if (p.statusAkun !== "AKTIF") return { ok: false, message: "Akun digitalcoop.id Anda tidak aktif. Hubungi Helpdesk KMP-ADNG." };
  if (!p.bolehMasuk) return { ok: false, message: "KMP-ADNG Academy khusus role Pihak Pekerja atau Content Creator yang aktif di digitalcoop.id." };
  if (role === "CREATOR" && !p.contentCreator) {
    return { ok: false, message: "Role Content Creator Anda di digitalcoop.id tidak aktif, akun Creator dibekukan. Hubungi Admin Academy." };
  }
  return { ok: true };
};

/** Kolom profil yang disegarkan dari digitalcoop.id setiap masuk. */
export const patchSinkron = (p: ProfilDigitalcoop, now: Date) => ({
  memberNumber: p.nomorAnggota,
  kycStatus: p.kycStatus?.slice(0, 20) ?? null,
  wilayah: p.wilayah,
  lastSyncedAt: now,
  updatedAt: now,
});
