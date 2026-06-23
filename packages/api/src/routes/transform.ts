import { Hono } from 'hono'
import { ZodError } from 'zod'
import { validateOps } from '../middleware/validate.js'
import type { Env } from '../index.js'

const MAX_SIZE = 10 * 1024 * 1024

export const transform = new Hono<{ Bindings: Env }>()

transform.post('/', async (c) => {
  const contentType = c.req.header('Content-Type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'Expected multipart/form-data', code: 'INVALID_CONTENT_TYPE' }, 400)
  }

  // Clone before reading — original body forwarded to upstream unchanged
  let form: FormData
  try {
    form = await c.req.raw.clone().formData()
  } catch {
    return c.json({ error: 'Failed to parse form data', code: 'PARSE_ERROR' }, 400)
  }

  const rawField = form.get('image')
  if (rawField === null) {
    return c.json({ error: 'Missing image field', code: 'MISSING_IMAGE' }, 400)
  }
  const file = rawField as unknown as Blob

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'File exceeds 10MB limit', code: 'FILE_TOO_LARGE' }, 413)
  }

  const opsRaw = form.get('ops')
  if (typeof opsRaw !== 'string') {
    return c.json({ error: 'Missing ops field', code: 'MISSING_OPS' }, 400)
  }

  let opsParsed: unknown
  try {
    opsParsed = JSON.parse(opsRaw)
  } catch {
    return c.json({ error: 'ops must be valid JSON', code: 'INVALID_JSON' }, 400)
  }

  try {
    validateOps(opsParsed)
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json({ error: 'Invalid ops', code: 'VALIDATION_ERROR', details: err.issues }, 400)
    }
    throw err
  }

  const upstream = new Request(`${c.env.SERVER_URL}/transform`, {
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
