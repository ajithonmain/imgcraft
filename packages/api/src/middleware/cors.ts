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

  const headers = corsHeaders(origins)
  for (const [key, value] of Object.entries(headers)) {
    c.res.headers.set(key, value)
  }
}

function corsHeaders(origins: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origins,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
  }
}
