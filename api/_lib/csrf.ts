/**
 * CSRF token generation and validation.
 * Uses HMAC-based tokens tied to the user's session.
 */

import crypto from "crypto";

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.AUTH_SECRET || "jgg-csrf-dev-secret";
const CSRF_TOKEN_LENGTH = 32;
const CSRF_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

interface CsrfTokenData {
  token: string;
  expiresAt: number;
}

// In-memory token store (per-serverless-instance)
const tokenStore = new Map<string, CsrfTokenData>();

/**
 * Generate a CSRF token for a given session ID.
 */
export function generateCsrfToken(sessionId: string): string {
  const randomBytes = crypto.randomBytes(CSRF_TOKEN_LENGTH);
  const hmac = crypto.createHmac("sha256", CSRF_SECRET);
  hmac.update(randomBytes);
  hmac.update(sessionId);
  hmac.update(String(Date.now()));
  const token = hmac.digest("hex");

  tokenStore.set(sessionId, {
    token,
    expiresAt: Date.now() + CSRF_EXPIRY_MS,
  });

  return token;
}

/**
 * Validate a CSRF token for a given session ID.
 */
export function validateCsrfToken(sessionId: string, token: string): boolean {
  const stored = tokenStore.get(sessionId);
  if (!stored) return false;
  if (stored.expiresAt <= Date.now()) {
    tokenStore.delete(sessionId);
    return false;
  }
  // Constant-time comparison
  if (stored.token.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(stored.token), Buffer.from(token));
}

/**
 * Extract session ID from auth cookie.
 */
export function getSessionId(cookies: Record<string, string>): string | null {
  return cookies["agro_session"] || null;
}

/**
 * Remove expired tokens (call periodically).
 */
export function cleanupTokens(): void {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expiresAt <= now) {
      tokenStore.delete(key);
    }
  }
}
