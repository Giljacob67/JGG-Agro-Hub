import type { VercelRequest } from "@vercel/node";
import { Redis } from "@upstash/redis";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

// ── Per-user rate limits ───────────────────────────────────────────

interface UserRateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window duration in ms */
  windowMs: number;
}

const USER_RATE_LIMITS: Record<string, UserRateLimitConfig> = {
  // Default for authenticated users
  default: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
  // Stricter for write operations
  write: { maxRequests: 30, windowMs: 60 * 1000 }, // 30 writes/min
  // Copilot (LLM calls are expensive)
  copilot: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min
  // Export operations
  export: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 exports/min
};

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

/**
 * Check per-user rate limit for authenticated API calls.
 * @param userId - The authenticated user's ID
 * @param tier - Rate limit tier (default, write, copilot, export)
 * @returns { allowed, remaining, resetMs }
 */
export async function checkUserRateLimit(
  userId: string,
  tier: keyof typeof USER_RATE_LIMITS = "default",
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const config = USER_RATE_LIMITS[tier] ?? USER_RATE_LIMITS.default;
  const key = `user:${userId}:${tier}`;
  const redis = upstashClient();
  const now = Date.now();

  if (redis) {
    try {
      const [current, ttl] = (await redis.eval(
        `local c = redis.call('INCR', KEYS[1]); if c == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); end; local t = redis.call('PTTL', KEYS[1]); return {c, t};`,
        [key],
        [String(config.windowMs)],
      )) as [number, number];

      const remaining = Math.max(0, config.maxRequests - current);
      if (current > config.maxRequests) {
        return { allowed: false, remaining: 0, resetMs: Math.max(ttl, 0) };
      }
      return { allowed: true, remaining, resetMs: Math.max(ttl, 0) };
    } catch {
      // fallback in-memory
    }
  }

  // In-memory fallback
  const local = memoryBucket.get(key);
  if (!local || local.resetAt <= now) {
    memoryBucket.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetMs: config.windowMs };
  }
  local.count += 1;
  const remaining = Math.max(0, config.maxRequests - local.count);
  if (local.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetMs: local.resetAt - now };
  }
  return { allowed: true, remaining, resetMs: local.resetAt - now };
}

/**
 * Get rate limit headers for the response.
 */
export function getRateLimitHeaders(
  result: { allowed: boolean; remaining: number; resetMs: number },
): Record<string, string> {
  return {
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
    ...(!result.allowed ? { "Retry-After": String(Math.ceil(result.resetMs / 1000)) } : {}),
  };
}

type Bucket = { count: number; resetAt: number };
const memoryBucket = new Map<string, Bucket>();
