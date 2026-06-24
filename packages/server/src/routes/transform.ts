import { Hono } from 'hono'
import { ZodError } from 'zod'
import { ImgCraftError } from 'imgcraft'
import { validateOps } from '../utils/validate.js'
import { runPipeline } from '../utils/pipeline-runner.js'

const MAX_SIZE = 10 * 1024 * 1024

const MIME: Record<string, string> = {
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
  tiff: 'image/tiff',
}

export const transform = new Hono()

transform.post('/', async (c) => {
  console.log('[transform] request received')
  const contentType = c.req.header('Content-Type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return c.json({ error: 'Expected multipart/form-data', code: 'INVALID_CONTENT_TYPE' }, 400)
  }

  let form: FormData
  try {
    form = await c.req.formData()
  } catch {
    return c.json({ error: 'Failed to parse form data', code: 'PARSE_ERROR' }, 400)
  }

  const field = form.get('image')
  if (!(field instanceof Blob)) {
    return c.json({ error: 'Missing image field', code: 'MISSING_IMAGE' }, 400)
  }

  if (field.size > MAX_SIZE) {
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

  let ops
  try {
    ops = validateOps(opsParsed)
  } catch (err) {
    if (err instanceof ZodError) {
      return c.json({ error: 'Invalid ops', code: 'VALIDATION_ERROR', details: err.issues }, 400)
    }
    throw err
  }

  const bytes = new Uint8Array(await field.arrayBuffer())

  try {
    const result = await runPipeline(bytes, ops)
    const mime = MIME[result.format] ?? 'application/octet-stream'
    return new Response(result.buffer, {
      status: 200,
      headers: { 'Content-Type': mime },
    })
  } catch (caught) {
    console.error('[transform] pipeline error:', caught)
    if (caught instanceof ImgCraftError) {
      return c.json({ error: caught.message, code: caught.code }, 422)
    }
    const message = caught instanceof Error ? caught.message : 'Unknown error'
    return c.json({ error: message, code: 'PROCESSING_ERROR' }, 500)
  }
})
