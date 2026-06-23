import { Hono } from 'hono'
import type { Env } from '../index.js'

export const info = new Hono<{ Bindings: Env }>()

info.post('/', async (c) => {
  const contentType = c.req.header('Content-Type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'Expected multipart/form-data', code: 'INVALID_CONTENT_TYPE' }, 400)
  }

  const upstream = new Request(`${c.env.SERVER_URL}/info`, {
    method: 'POST',
    headers: buildUpstreamHeaders(c.req.raw.headers, c.env.INTERNAL_SECRET),
    body: c.req.raw.body,
  })

  try {
    return await fetch(upstream)
  } catch {
    return c.json({ error: 'Upstream unreachable', code: 'UPSTREAM_ERROR' }, 502)
  }
})

function buildUpstreamHeaders(incoming: Headers, secret: string): Headers {
  const out = new Headers(incoming)
  out.set('X-Internal-Secret', secret)
  return out
}
