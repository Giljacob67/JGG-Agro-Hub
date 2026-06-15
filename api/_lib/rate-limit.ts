import type { VercelRequest } from "@vercel/node";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function clientIp(req: VercelRequest) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return first?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

export function checkLoginRateLimit(req: VercelRequest, email: string) {
  const now = Date.now();
  const key = `${clientIp(req)}:${email.toLowerCase()}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count <= MAX_ATTEMPTS) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
  };
}

export function clearLoginRateLimit(req: VercelRequest, email: string) {
  buckets.delete(`${clientIp(req)}:${email.toLowerCase()}`);
}
