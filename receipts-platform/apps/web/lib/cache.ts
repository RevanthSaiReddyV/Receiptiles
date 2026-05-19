import { redis } from "./redis";

export async function cached<T>(
  key: string,
  ttlSec: number,
  fn: () => Promise<T>
): Promise<T> {
  try {
    const cachedValue = await redis.get<T>(key);
    if (cachedValue !== null && cachedValue !== undefined) {
      return cachedValue;
    }
  } catch (error) {
    console.warn("[cache] Redis read failed, executing function:", error);
  }

  const result = await fn();

  try {
    await redis.set(key, JSON.stringify(result), { ex: ttlSec });
  } catch (error) {
    console.warn("[cache] Redis write failed:", error);
  }

  return result;
}

export async function invalidate(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (error) {
    console.warn("[cache] Redis invalidate failed:", error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    let cursor = 0;
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = Number(result[0]);
      const keys = result[1];
      if (keys.length > 0) {
        const pipeline = redis.pipeline();
        for (const key of keys) {
          pipeline.del(key);
        }
        await pipeline.exec();
      }
    } while (cursor !== 0);
  } catch (error) {
    console.warn("[cache] Redis invalidatePattern failed:", error);
  }
}
