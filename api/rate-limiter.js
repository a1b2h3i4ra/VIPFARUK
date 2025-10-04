import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize Redis client lazily to avoid failures when env vars are missing
let redisClient;
let limiterInstance;

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!redisClient) {
    redisClient = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redisClient;
}

function getLimiter() {
  const redis = getRedis();
  if (!redis) return null;
  if (!limiterInstance) {
    limiterInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "10 m"), // 20 requests per 10 minutes
      analytics: true,
      prefix: "itp:rl:v1",
    });
  }
  return limiterInstance;
}

export function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0].trim();
  if (Array.isArray(xf) && xf.length > 0) return xf[0].trim();
  return (
    req.headers["x-real-ip"] ||
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    (req.socket && req.socket.remoteAddress) ||
    "unknown"
  );
}

// Returns { ok: boolean, message?: string, retryAfter?: number }
export async function rateLimitCheck(req) {
  try {
    const redis = getRedis();
    const limiter = getLimiter();
    // If Redis is not configured, allow traffic but warn via header upstream
    if (!redis || !limiter) {
      return { ok: true, message: "rate-limit-disabled" };
    }

    const ip = String(getClientIp(req));
    const banKey = `itp:ban:${ip}`;

    // If banned, block immediately
    const isBanned = await redis.get(banKey);
    if (isBanned) {
      const ttl = await redis.ttl(banKey); // seconds remaining
      return {
        ok: false,
        retryAfter: typeof ttl === "number" && ttl > 0 ? ttl : 1800,
        message: "Too many requests. You are temporarily blocked. Try again later.",
      };
    }

    const result = await limiter.limit(ip);
    if (!result.success) {
      // Exceeded threshold: ban for 30 minutes
      await redis.set(banKey, "1", { ex: 60 * 30 });
      return { ok: false, retryAfter: 60 * 30, message: "Rate limit exceeded. You are banned for 30 minutes." };
    }

    return { ok: true };
  } catch (err) {
    // Fail-open: do not break login flows if limiter errors
    console.error("RateLimiter Error:", err);
    return { ok: true, message: "rate-limit-error-fail-open" };
  }
}


