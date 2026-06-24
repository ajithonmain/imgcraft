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
  try {
    console.log('[transform] request received')
    const contentType = c.req.header('Content-Type') ?? ''
    console.log('[transform] content-type:', contentType.slice(0, 80))

    if (!contentType.includes('multipart/form-data')) {
      return c.json({ error: 'Expected multipart/form-data', code: 'INVALID_CONTENT_TYPE' }, 400)
    }

    console.log('[transform] parsing form data')
    let form: FormData
    try {
      form = await c.req.formData()
    } catch (err) {
      console.error('[transform] formData() threw:', err)
      return c.json({ error: 'Failed to parse form data', code: 'PARSE_ERROR' }, 400)
    }
    console.log('[transform] form keys:', [...form.keys()])

    const field = form.get('image')
    console.log('[transform] image field type:', field === null ? 'null' : typeof field, field instanceof Blob ? '(Blob)' : '')
    if (!(field instanceof Blob)) {
      return c.json({ error: 'Missing image field', code: 'MISSING_IMAGE' }, 400)
    }

    console.log('[transform] image size:', field.size)
    if (field.size > MAX_SIZE) {
      return c.json({ error: 'File exceeds 10MB limit', code: 'FILE_TOO_LARGE' }, 413)
    }

    const opsRaw = form.get('ops')
    console.log('[transform] ops raw:', typeof opsRaw === 'string' ? opsRaw.slice(0, 100) : opsRaw)
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
    console.log('[transform] ops validated, count:', ops.length)

    console.log('[transform] reading arrayBuffer')
    const bytes = new Uint8Array(await field.arrayBuffer())
    console.log('[transform] bytes length:', bytes.length)

    console.log('[transform] running pipeline')
    const result = await runPipeline(bytes, ops)
    console.log('[transform] pipeline done, format:', result.format, 'size:', result.buffer.length)

    const mime = MIME[result.format] ?? 'application/octet-stream'
    return new Response(result.buffer, {
      status: 200,
      headers: { 'Content-Type': mime },
    })
  } catch (caught) {
    console.error('[transform] caught at top level:', caught)
    if (caught instanceof ImgCraftError) {
      return c.json({ error: caught.message, code: caught.code }, 422)
    }
    const message = caught instanceof Error ? caught.message : String(caught)
    return c.json({ error: message, code: 'PROCESSING_ERROR' }, 500)
  }
})
