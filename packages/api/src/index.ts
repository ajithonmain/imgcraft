import { Hono } from 'hono'
import { cors } from './middleware/cors.js'
import { rateLimit } from './middleware/ratelimit.js'
import { health } from './routes/health.js'
import { info } from './routes/info.js'
import { transform } from './routes/transform.js'
import { handleDocs, handleOpenAPIJson } from './routes/docs.js'
import spec from './openapi.js'

export interface Env {
  RATE_LIMIT_RPM: string
  RATE_LIMIT_DAY: string
  RATE_LIMIT_AI_DAY: string
  ALLOWED_ORIGINS: string
  RATE_LIMIT_KV: KVNamespace
  SERVER_URL: string
  INTERNAL_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors)

// /docs routes bypass rate limiting
app.get('/docs', () => handleDocs())
app.get('/docs/openapi.json', () => handleOpenAPIJson(spec))

app.use('*', rateLimit)

app.route('/health', health)
app.route('/info', info)
app.route('/transform', transform)

export default app
