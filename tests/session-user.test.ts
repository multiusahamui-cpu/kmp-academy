import { describe, expect, it } from "vitest";
import { evaluateSession } from "../server/lib/session-user";

const user = (over: Partial<Parameters<typeof evaluateSession>[1] & object> = {}) => ({
  id: "u1",
  role: "STUDENT",
  email: "a@digitalcoop.id",
  status: "ACTIVE",
  passwordChangedAt: null as Date | null,
  ...over,
});

describe("evaluateSession", () => {
  it("tanpa userId di sesi = belum login", () => {
    expect(evaluateSession(undefined, undefined)).toMatchObject({ ok: false, status: 401 });
    expect(evaluateSession({}, user())).toMatchObject({ ok: false, status: 401 });
  });

  it("akun hilang = sesi tidak valid", () => {
    expect(evaluateSession({ userId: "u1", loginAt: 1 }, undefined)).toMatchObject({ ok: false, status: 401 });
  });

  it("akun dibekukan = 403", () => {
    expect(evaluateSession({ userId: "u1", loginAt: 1 }, user({ status: "SUSPENDED" }))).toMatchObject({ ok: false, status: 403 });
  });

  it("sesi lebih lama dari pergantian password ditolak, yang lebih baru lolos", () => {
    const changed = new Date("2026-11-17T05:00:00Z");
    expect(evaluateSession({ userId: "u1", loginAt: changed.getTime() - 1 }, user({ passwordChangedAt: changed }))).toMatchObject({ ok: false, status: 401 });
    expect(evaluateSession({ userId: "u1", loginAt: changed.getTime() }, user({ passwordChangedAt: changed }))).toMatchObject({ ok: true });
  });

  it("role diambil dari database, bukan dari sesi", () => {
    const result = evaluateSession({ userId: "u1", loginAt: 1 }, user({ role: "MENTOR" }));
    expect(result).toMatchObject({ ok: true, user: { role: "MENTOR" } });
  });
});
