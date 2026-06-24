import type { MiddlewareHandler } from 'hono'
import type { Env } from '../index.js'

export const cors: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const origins = c.env.ALLOWED_ORIGINS ?? '*'

  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origins),
    })
  }

  await next()

  // fetch() responses have immutable headers — wrap in a new Response
  const headers = new Headers(c.res.headers)
  for (const [key, value] of Object.entries(corsHeaders(origins))) {
    headers.set(key, value)
  }
  c.res = new Response(c.res.body, {
    status: c.res.status,
    statusText: c.res.statusText,
    headers,
  })
}

function corsHeaders(origins: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origins,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  }
}
