/**
 * Пример бэкенда rate-limit на Upstash Redis.
 * Подключить в lib/rate-limit.ts после создания Redis в Vercel (docs/INFRA.md).
 */
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export async function rateLimitRedis(
  identifier: string,
  limit = 30,
  windowMs = 60_000
): Promise<{ success: boolean; remaining: number }> {
  const key = `rl:${identifier}`
  const count = await redis.incr(key)
  if (count === 1) {
    await redis.pexpire(key, windowMs)
  }
  if (count > limit) {
    return { success: false, remaining: 0 }
  }
  return { success: true, remaining: Math.max(0, limit - count) }
}
