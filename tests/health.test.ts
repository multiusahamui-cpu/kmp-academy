import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "http";
import type { AddressInfo } from "net";

// db/index.ts menghentikan proses bila DATABASE_URL kosong; Pool tidak tersambung sampai dipakai.
process.env.DATABASE_URL ||= "postgres://test:test@127.0.0.1:1/test";

let server: Server;
let base: string;

beforeAll(async () => {
  const { default: app } = await import("../server/App");
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => new Promise<void>((r) => server.close(() => r())));

describe("GET /api/health", () => {
  it("mengembalikan status UP", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).toContain("UP");
  });

  it("endpoint tak dikenal → 404", async () => {
    const res = await fetch(`${base}/api/tidak-ada`);
    expect(res.status).toBe(404);
  });
});
