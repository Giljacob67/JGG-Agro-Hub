import type { VercelRequest } from "@vercel/node";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function upstashClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function clientIp(req: VercelRequest) {
  const trusted = req.headers["x-vercel-forwarded-for"];
  const firstTrusted = Array.isArray(trusted) ? trusted[0] : trusted;
  const forwarded = req.headers["x-forwarded-for"];
  const first = firstTrusted ?? (Array.isArray(forwarded) ? forwarded[0] : forwarded);
  return first?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

export async function checkLoginRateLimit(req: VercelRequest, email: string) {
  const key = `login:${clientIp(req)}:${email.toLowerCase()}`;
  const redis = upstashClient();
  const now = Date.now();
  const windowEnd = now + WINDOW_MS;

  if (redis) {
    try {
      const [current, ttl] = (await redis.eval(
        `local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; local t = redis.call('PTTL', KEYS[1]); return {c, t};`,
        [key],
        [String(WINDOW_MS)],
      )) as [number, number];
      if (current > MAX_ATTEMPTS) {
        return { allowed: false, retryAfterSeconds: Math.ceil(Math.max(ttl, 0) / 1000) };
      }
      return { allowed: true, retryAfterSeconds: 0 };
    } catch {
      // fallback in-memory se Redis falhar
    }
  }

  const local = memoryBucket.get(key);
  if (!local || local.resetAt <= now) {
    memoryBucket.set(key, { count: 1, resetAt: windowEnd });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  local.count += 1;
  if (local.count > MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSeconds: Math.ceil((local.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export async function clearLoginRateLimit(req: VercelRequest, email: string) {
  const key = `login:${clientIp(req)}:${email.toLowerCase()}`;
  const redis = upstashClient();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      // ignore
    }
  }
  memoryBucket.delete(key);
}

type Bucket = { count: number; resetAt: number };
const memoryBucket = new Map<string, Bucket>();
