import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { applyCompress } from './format.js'

async function makeTestImage(): Promise<Buffer> {
  // Noise pattern gives quality settings something to bite into
  const pixels = Buffer.alloc(200 * 200 * 3)
  for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 37 + 13) % 256
  return sharp(pixels, { raw: { width: 200, height: 200, channels: 3 } })
    .png()
    .toBuffer()
}

describe('applyCompress', () => {
  it('defaults to webp output', async () => {
    const input = await makeTestImage()
    const { info } = await applyCompress(sharp(input), {}).toBuffer({ resolveWithObject: true })
    expect(info.format).toBe('webp')
  })

  it('lower quality produces smaller file', async () => {
    const input = await makeTestImage()
    const [hi, lo] = await Promise.all([
      applyCompress(sharp(input), { quality: 95 }).toBuffer(),
      applyCompress(sharp(input), { quality: 10 }).toBuffer(),
    ])
    expect(lo.length).toBeLessThan(hi.length)
  })

  it('converts to jpeg', async () => {
    const input = await makeTestImage()
    const { info } = await applyCompress(sharp(input), { format: 'jpeg', quality: 80 }).toBuffer({
      resolveWithObject: true,
    })
    expect(info.format).toBe('jpeg')
  })

  it('converts to avif', async () => {
    const input = await makeTestImage()
    const { info } = await applyCompress(sharp(input), { format: 'avif', quality: 50 }).toBuffer({
      resolveWithObject: true,
    })
    // sharp reports AVIF output as 'heif' (the container format)
    expect(['avif', 'heif']).toContain(info.format)
  })

  it('accepts effort option without error', async () => {
    const input = await makeTestImage()
    const { info } = await applyCompress(sharp(input), {
      format: 'webp',
      quality: 80,
      effort: 6,
    }).toBuffer({ resolveWithObject: true })
    expect(info.format).toBe('webp')
  })
})
