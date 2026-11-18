import { describe, expect, it } from "vitest";
import { buildCorsOptions, parseAllowedOrigins } from "../server/lib/security";

const check = (env: NodeJS.ProcessEnv, origin: string | undefined): boolean => {
  const options = buildCorsOptions(env);
  let result = false;
  (options.origin as (o: string | undefined, cb: (e: Error | null, allow?: boolean) => void) => void)(origin, (_e, allow) => {
    result = Boolean(allow);
  });
  return result;
};

describe("CORS ketat", () => {
  it("mengurai ALLOWED_ORIGINS dan membuang yang tidak valid", () => {
    expect(parseAllowedOrigins("https://academy.digitalcoop.id/, rusak ,")).toEqual(["https://academy.digitalcoop.id"]);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  it("produksi: hanya origin dalam daftar, tanpa Origin tetap lolos", () => {
    const env = { NODE_ENV: "production", ALLOWED_ORIGINS: "https://academy.digitalcoop.id" };
    expect(check(env, "https://academy.digitalcoop.id")).toBe(true);
    expect(check(env, "https://situs-lain.example")).toBe(false);
    expect(check(env, "http://localhost:5173")).toBe(false);
    expect(check(env, undefined)).toBe(true);
  });

  it("pengembangan: localhost diizinkan", () => {
    expect(check({ NODE_ENV: "development" }, "http://localhost:5173")).toBe(true);
    expect(check({ NODE_ENV: "development" }, "https://situs-lain.example")).toBe(false);
  });
});
