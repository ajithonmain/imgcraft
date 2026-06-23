import { Hono } from 'hono'

const VERSION = '0.1.0'

export const health = new Hono()

health.get('/', (c) =>
  c.json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
  }),
)
