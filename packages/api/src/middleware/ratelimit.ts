import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index.js'

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

const AI_OPS = new Set(['removeBackground', 'smartCrop', 'upscale'])

function hasAiOp(ops: unknown[]): boolean {
  return ops.some(
    (op) =>
      typeof op === 'object' &&
      op !== null &&
      AI_OPS.has((op as Record<string, unknown>).op as string),
  )
}

async function checkAndIncrement(
  kv: KVNamespace,
  key: string,
  limit: number,
  ttl: number,
): Promise<boolean> {
  const raw = await kv.get(key)
  const count = raw !== null ? parseInt(raw, 10) : 0
  if (count >= limit) return false
  await kv.put(key, String(count + 1), { expirationTtl: ttl })
  return true
}

export const rateLimit: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // CF-Connecting-IP is set by Cloudflare and cannot be spoofed in production.
  // X-Forwarded-For is user-controlled — treat as dev-only fallback, never trusted in prod.
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For')

  if (!ip) {
    return c.json({ error: 'Unable to determine client IP', code: 'MISSING_IP' }, 400)
  }

  const limitMin = parseInt(c.env.RATE_LIMIT_RPM ?? '10', 10)
  const limitDay = parseInt(c.env.RATE_LIMIT_DAY ?? '50', 10)
  const limitAiDay = parseInt(c.env.RATE_LIMIT_AI_DAY ?? '10', 10)
  const today = todayUTC()

  // Tier 1: per-minute limit
  const okMin = await checkAndIncrement(c.env.RATE_LIMIT_KV, `rl:min:${ip}`, limitMin, 60)
  if (!okMin) {
    return c.json(
      { error: 'Too Many Requests', code: 'RATE_LIMIT_EXCEEDED' },
      429,
      { 'Retry-After': '60' },
    )
  }

  // Tier 2: per-day limit
  const okDay = await checkAndIncrement(
    c.env.RATE_LIMIT_KV,
    `rl:day:${ip}:${today}`,
    limitDay,
    86400,
  )
  if (!okDay) {
    return c.json(
      { error: 'Daily request limit exceeded', code: 'RATE_LIMIT_DAY_EXCEEDED' },
      429,
      { 'Retry-After': '86400' },
    )
  }

  // Tier 3: AI ops per-day — only for POST /transform requests containing AI operations.
  // Clone the request to peek at the ops field without consuming the original body.
  if (c.req.method === 'POST' && c.req.path.endsWith('/transform')) {
    try {
      const form = await c.req.raw.clone().formData()
      const opsStr = form.get('ops')
      if (opsStr != null) {
        let ops: unknown[] = []
        try {
          ops = JSON.parse(String(opsStr))
        } catch {
          // invalid JSON — skip AI check
        }
        if (Array.isArray(ops) && hasAiOp(ops)) {
          const okAi = await checkAndIncrement(
            c.env.RATE_LIMIT_KV,
            `rl:ai:${ip}:${today}`,
            limitAiDay,
            86400,
          )
          if (!okAi) {
            return c.json(
              { error: 'AI operations daily limit exceeded', code: 'RATE_LIMIT_AI_EXCEEDED' },
              429,
              { 'Retry-After': '86400' },
            )
          }
        }
      }
    } catch {
      // clone or formData() failure — continue without AI tier check
    }
  }

  await next()
}
