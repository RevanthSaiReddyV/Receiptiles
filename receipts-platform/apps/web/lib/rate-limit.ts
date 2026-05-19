import { redis } from "./redis";

export async function rateLimit(
  identifier: string,
  limit = 5,
  windowSec = 60
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const key = `rate_limit:${identifier}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSec;

  try {
    // Sliding window counter: remove old entries, add current, count
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, { score: now, member: `${now}:${Math.random()}` });
    pipeline.zcard(key);
    pipeline.expire(key, windowSec);

    const results = await pipeline.exec();
    const count = results[2] as number;

    const success = count <= limit;
    const remaining = Math.max(0, limit - count);
    const reset = now + windowSec;

    return { success, remaining, reset };
  } catch (error) {
    // If Redis is unavailable, allow the request (fail open)
    console.warn("[rate-limit] Redis unavailable, allowing request:", error);
    return { success: true, remaining: limit, reset: now + windowSec };
  }
}
