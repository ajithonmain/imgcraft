import { Hono } from 'hono'
import { img } from 'imgcraft'

const MAX_SIZE = 10 * 1024 * 1024

export const info = new Hono()

info.post('/', async (c) => {
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

  const bytes = new Uint8Array(await field.arrayBuffer())

  try {
    const meta = await img(bytes).meta()
    return c.json({
      width: meta.width,
      height: meta.height,
      format: meta.format,
      size: field.size,
      hasAlpha: meta.hasAlpha,
      channels: meta.channels,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return c.json({ error: message, code: 'METADATA_ERROR' }, 500)
  }
})
