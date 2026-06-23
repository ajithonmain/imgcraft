import type { MiddlewareHandler } from 'hono'

export const auth: MiddlewareHandler = async (c, next) => {
  const secret = process.env['INTERNAL_SECRET']
  if (!secret) {
    return c.json({ error: 'Server misconfigured', code: 'NO_SECRET' }, 500)
  }

  const header = c.req.header('X-Internal-Secret')
  if (!header || header !== secret) {
    return c.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401)
  }

  await next()
}
