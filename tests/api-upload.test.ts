import { describe, it, expect } from "vitest";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import api from "../client/src/services/api";

// Regresi: header Content-Type: application/json bawaan pada instance axios membuat FormData diserialisasi menjadi JSON,
// sehingga berkas unggahan (foto profil, thumbnail, modul, bukti bayar) tidak pernah sampai ke server (400 "Pilih berkas...").
const capture = async (data: unknown): Promise<InternalAxiosRequestConfig> => {
  let seen: InternalAxiosRequestConfig | undefined;
  await api.post("/uji", data, {
    adapter: async (config) => {
      seen = config;
      return { data: {}, status: 200, statusText: "OK", headers: {}, config } as AxiosResponse;
    },
  });
  return seen as InternalAxiosRequestConfig;
};

describe("instance axios klien", () => {
  it("mengirim FormData apa adanya (bukan JSON) agar berkas terkirim", async () => {
    const form = new FormData();
    form.append("avatar", new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" }), "a.png");
    const config = await capture(form);
    expect(config.data).toBeInstanceOf(FormData);
    expect(String(config.headers.get("Content-Type") ?? "")).not.toContain("application/json");
  });

  it("tetap mengirim objek biasa sebagai JSON", async () => {
    const config = await capture({ nama: "uji" });
    expect(config.data).toBe(JSON.stringify({ nama: "uji" }));
    expect(String(config.headers.get("Content-Type"))).toContain("application/json");
  });
});
