import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { auth } from './middleware/auth.js'
import { health } from './routes/health.js'
import { info } from './routes/info.js'
import { transform } from './routes/transform.js'

const app = new Hono()

app.use('*', auth)

app.route('/health', health)
app.route('/info', info)
app.route('/transform', transform)

app.onError((err, c) => {
  return c.json({ error: err.message, code: 'INTERNAL_ERROR' }, 500)
})

const port = parseInt(process.env['PORT'] ?? '3001', 10)

serve({ fetch: app.fetch, port }, () => {
  console.log(`imgcraft server running on port ${port}`)
})
