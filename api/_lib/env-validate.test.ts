import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { assertValidEnv, __resetEnvValidationCacheForTest } from "./env-validate.js";

const STRONG = "x".repeat(40);
const UPSTASH = {
  url: "https://example.upstash.io",
  token: "tok_".padEnd(40, "y"),
};

describe("assertValidEnv", () => {
  beforeEach(() => {
    __resetEnvValidationCacheForTest();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    __resetEnvValidationCacheForTest();
  });

  it("no-op fora de produção (dev sem segredos)", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("AUTH_SECRET", "");
    expect(() => assertValidEnv()).not.toThrow();
  });

  it("passa em produção com AUTH_SECRET forte + Upstash", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AUTH_SECRET", STRONG);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.url);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.token);
    expect(() => assertValidEnv()).not.toThrow();
  });

  it("lança em produção sem AUTH_SECRET", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.url);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.token);
    expect(() => assertValidEnv()).toThrow(/AUTH_SECRET/);
  });

  it("lança em produção com AUTH_SECRET curto", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "curto");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", UPSTASH.url);
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", UPSTASH.token);
    expect(() => assertValidEnv()).toThrow(/AUTH_SECRET/);
  });

  it("Upstash ausente apenas avisa (não lança) sem flag", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AUTH_SECRET", STRONG);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("REQUIRE_DISTRIBUTED_RATELIMIT", "");
    expect(() => assertValidEnv()).not.toThrow();
  });

  it("Upstash ausente lança quando REQUIRE_DISTRIBUTED_RATELIMIT=true", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("AUTH_SECRET", STRONG);
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("REQUIRE_DISTRIBUTED_RATELIMIT", "true");
    expect(() => assertValidEnv()).toThrow(/Upstash|rate limit/i);
  });
});
