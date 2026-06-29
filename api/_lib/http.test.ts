import { describe, it, expect, beforeEach } from "vitest";
import type { VercelResponse } from "@vercel/node";
import {
  setSessionCookie,
  clearSessionCookie,
  clearOAuthCookies,
} from "./http.js";

/**
 * Mock mínimo de VercelResponse focado em Set-Cookie. Espelha o comportamento
 * de `setHeader` (substitui) + `getHeader`, suficiente para validar que os
 * helpers de cookie fazem merge (append) em vez de descartar uns aos outros.
 */
function makeRes(): VercelResponse & { cookies: string[] } {
  const headers = new Map<string, string | string[]>();
  const res = {
    setHeader(name: string, value: string | string[]) {
      headers.set(name.toLowerCase(), value);
      return res;
    },
    getHeader(name: string) {
      return headers.get(name.toLowerCase());
    },
    get cookies(): string[] {
      const v = headers.get("set-cookie");
      if (!v) return [];
      return Array.isArray(v) ? v : [v];
    },
  } as unknown as VercelResponse & { cookies: string[] };
  return res;
}

describe("cookies de sessão (Set-Cookie merge)", () => {
  beforeEach(() => {
    delete process.env.VERCEL_ENV; // dev: cookie sem prefixo __Host-/Secure
  });

  it("logout limpa a sessão MESMO após clearOAuthCookies (regressão)", () => {
    const res = makeRes();
    // Ordem do handler de logout: limpa sessão e depois os cookies de OAuth.
    clearSessionCookie(res);
    clearOAuthCookies(res);

    const joined = res.cookies.join("\n");
    // A limpeza da sessão precisa sobreviver (não ser sobrescrita).
    expect(joined).toMatch(/agro_session=;[^\n]*Max-Age=0/);
    // E as limpezas de OAuth também presentes.
    expect(joined).toMatch(/agro_oauth_state=;[^\n]*Max-Age=0/);
    expect(joined).toMatch(/agro_oauth_pkce=;[^\n]*Max-Age=0/);
  });

  it("clearSessionCookie também expira o cookie CSRF", () => {
    const res = makeRes();
    clearSessionCookie(res);
    const joined = res.cookies.join("\n");
    expect(joined).toMatch(/agro_csrf=;[^\n]*Max-Age=0/);
  });

  it("setSessionCookie preserva limpezas de OAuth anteriores (callback SSO)", () => {
    const res = makeRes();
    clearOAuthCookies(res);
    setSessionCookie(res, "tok123");
    const joined = res.cookies.join("\n");
    expect(joined).toContain("agro_session=tok123");
    expect(joined).toMatch(/agro_oauth_state=;[^\n]*Max-Age=0/);
  });
});
