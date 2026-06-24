import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index.js'

const WINDOW_SECONDS = 60

export const rateLimit: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  // CF-Connecting-IP is set by Cloudflare and cannot be spoofed in production.
  // X-Forwarded-For is user-controlled — treat as dev-only fallback, never trusted in prod.
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For')

  if (!ip) {
    return c.json({ error: 'Unable to determine client IP', code: 'MISSING_IP' }, 400)
  }

  const limit = parseInt(c.env.RATE_LIMIT_RPM ?? '60', 10)
  const key = `rl:${ip}`

  const raw = await c.env.RATE_LIMIT_KV.get(key)
  const count = raw !== null ? parseInt(raw, 10) : 0

  if (count >= limit) {
    return c.json(
      { error: 'Too Many Requests', code: 'RATE_LIMIT_EXCEEDED' },
      429,
      { 'Retry-After': String(WINDOW_SECONDS) },
    )
  }

  if (raw === null) {
    await c.env.RATE_LIMIT_KV.put(key, '1', { expirationTtl: WINDOW_SECONDS })
  } else {
    await c.env.RATE_LIMIT_KV.put(key, String(count + 1), {
      expirationTtl: WINDOW_SECONDS,
    })
  }

  await next()
}
