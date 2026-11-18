import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import createMemoryStore from "memorystore";
import { readSessionSecret } from "./session-secret";

declare module "express-session" {
  interface SessionData {
    userId: string;
    /** Waktu login (ms). Sesi lebih lama dari pergantian password ditolak. */
    loginAt: number;
  }
}

export const SESSION_COOKIE = "academy.sid";
const MemoryStore = createMemoryStore(session);

let redisClient: ReturnType<typeof createClient> | undefined;

/**
 * Middleware sesi. Sesi disimpan di Redis (prefix `academy:sess:`, pisahkan DB Redis lewat REDIS_URL,
 * mis. redis://127.0.0.1:6379/5). Tanpa REDIS_URL hanya boleh di pengembangan (memorystore).
 */
export const buildSessionMiddleware = (env: NodeJS.ProcessEnv = process.env) => {
  const isProd = env.NODE_ENV === "production";
  let store: session.Store;

  if (env.REDIS_URL) {
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on("error", (err) => console.error("[redis] error:", err.message));
    store = new RedisStore({ client: redisClient, prefix: env.SESSION_PREFIX || "academy:sess:" });
  } else if (isProd) {
    throw new Error("REDIS_URL wajib diisi di produksi (sesi disimpan di Redis).");
  } else {
    console.warn("[session] REDIS_URL kosong: memakai memorystore (hanya untuk pengembangan).");
    store = new MemoryStore({ checkPeriod: 24 * 60 * 60 * 1000 });
  }

  return session({
    name: SESSION_COOKIE,
    store,
    secret: readSessionSecret(env),
    resave: false,
    saveUninitialized: false,
    rolling: false,
    cookie: {
      httpOnly: true,
      // "auto": Secure bila koneksi HTTPS (nginx wajib meneruskan X-Forwarded-Proto).
      secure: isProd ? "auto" : false,
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // diganti saat login sesuai login_session_hours
    },
  });
};

/** Menyambungkan Redis sebelum server menerima permintaan. Produksi berhenti bila gagal. */
export const connectSessionStore = async (): Promise<void> => {
  if (!redisClient) return;
  await redisClient.connect();
  console.log("[redis] terhubung (sesi Academy)");
};

/** Memulai sesi baru setelah login/daftar. ID sesi diganti (anti session fixation). */
export const startSession = (req: any, userId: string, maxAgeMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    req.session.regenerate((regenErr: Error | null) => {
      if (regenErr) return reject(regenErr);
      req.session.userId = userId;
      req.session.loginAt = Date.now();
      req.session.cookie.maxAge = maxAgeMs;
      req.session.save((saveErr: Error | null) => (saveErr ? reject(saveErr) : resolve()));
    });
  });

/** Menghapus sesi di server (Redis) dan cookie-nya. Aman dipanggil tanpa sesi. */
export const endSession = (req: any, res: any): Promise<void> =>
  new Promise((resolve) => {
    const finish = () => {
      res.clearCookie(SESSION_COOKIE);
      resolve();
    };
    if (!req.session) return finish();
    req.session.destroy(() => finish());
  });
