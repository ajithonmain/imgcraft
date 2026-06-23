import { Hono } from 'hono'
import type { Env } from '../index.js'

const VERSION = '0.1.0'

export const health = new Hono<{ Bindings: Env }>()

health.get('/', (c) =>
  c.json({
    status: 'ok',
    version: VERSION,
    timestamp: new Date().toISOString(),
  }),
)
