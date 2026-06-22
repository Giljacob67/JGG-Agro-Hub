import { describe, it, expect, afterEach, vi } from "vitest";
import { assertWritableInProd } from "./guard.js";

describe("assertWritableInProd", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("permite escrita em dev (VERCEL_ENV ausente)", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("DATABASE_URL", "");
    expect(assertWritableInProd("leads")).toEqual({ ok: true });
  });

  it("permite escrita em produção com DATABASE_URL configurada", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@host/db");
    expect(assertWritableInProd("accounts")).toEqual({ ok: true });
  });

  it("bloqueia escrita (503) em produção sem DATABASE_URL", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    const g = assertWritableInProd("opportunities");
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.status).toBe(503);
      expect(g.message).toContain("opportunities");
      expect(g.message).toContain("DATABASE_URL");
    }
  });

  it("é no-op em dev mesmo sem DATABASE_URL", () => {
    vi.stubEnv("VERCEL_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    expect(assertWritableInProd("tasks")).toEqual({ ok: true });
  });

  it("bloqueia (503) recurso memory-only em produção mesmo com DATABASE_URL", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@host/db");
    const g = assertWritableInProd("recurso-nao-migrado");
    expect(g.ok).toBe(false);
    if (!g.ok) {
      expect(g.status).toBe(503);
      expect(g.message).toContain("recurso-nao-migrado");
      expect(g.message).toContain("perda silenciosa");
    }
  });

  it("permite recursos secundários migrados (documents) em produção com DATABASE_URL", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://user:pass@host/db");
    expect(assertWritableInProd("documents")).toEqual({ ok: true });
  });

  it("permite recurso não-migrado em dev (não bloqueia local)", () => {
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("DATABASE_URL", "");
    expect(assertWritableInProd("recurso-nao-migrado")).toEqual({ ok: true });
  });
});