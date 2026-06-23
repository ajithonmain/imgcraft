import { describe, it, expect, beforeAll } from 'vitest'
import sharp from 'sharp'
import { img, ImgCraftError } from './index.js'

let fixture: Buffer
let fixturePng: Buffer

beforeAll(async () => {
  fixture = await sharp({
    create: { width: 200, height: 150, channels: 3, background: { r: 128, g: 64, b: 32 } },
  })
    .jpeg()
    .toBuffer()

  fixturePng = await sharp({
    create: { width: 200, height: 150, channels: 4, background: { r: 64, g: 128, b: 32, alpha: 1 } },
  })
    .png()
    .toBuffer()
})

describe('resize', () => {
  it('resizes to exact width and height', async () => {
    const out = await img(fixture).resize(100, 75).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(100)
    expect(meta.height).toBe(75)
  })

  it('resizes to width only, preserving aspect ratio', async () => {
    const out = await img(fixture).resize(50).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(50)
    expect(meta.height).toBe(38)
  })

  it('respects fit: contain', async () => {
    const out = await img(fixture).resize(100, 100, { fit: 'contain' }).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(100)
    expect(meta.height).toBe(100)
  })
})

describe('format', () => {
  it('converts to webp', async () => {
    const out = await img(fixture).webp({ quality: 80 }).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.format).toBe('webp')
  })

  it('converts to png', async () => {
    const out = await img(fixture).png().toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.format).toBe('png')
  })

  it('converts to avif', async () => {
    const out = await img(fixture).avif({ quality: 60 }).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.format).toBe('heif')
  })

  it('quality() applies to current format', async () => {
    const hi = await img(fixture).jpeg().quality(90).toBuffer()
    const lo = await img(fixture).jpeg().quality(10).toBuffer()
    expect((hi as Buffer).length).toBeGreaterThan((lo as Buffer).length)
  })

  it('throws on invalid quality value', () => {
    expect(() => img(fixture).quality(0)).toThrow(ImgCraftError)
    expect(() => img(fixture).quality(101)).toThrow(ImgCraftError)
  })
})

describe('grayscale', () => {
  it('produces a grayscale image', async () => {
    // Create a strongly-coloured source so greyscale conversion is detectable
    const colorSrc = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 200, g: 50, b: 10 } },
    })
      .png()
      .toBuffer()

    const out = await img(colorSrc).grayscale().png().toBuffer()

    const { data, info } = await sharp(out as Buffer)
      .raw()
      .toBuffer({ resolveWithObject: true })

    const r = data[0]!
    const g = info.channels >= 2 ? data[1]! : r
    const b = info.channels >= 3 ? data[2]! : r

    expect(r).toBe(g)
    expect(g).toBe(b)
  })
})

describe('flip / flop', () => {
  it('flip does not change dimensions', async () => {
    const out = await img(fixture).flip().toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(150)
  })

  it('flop does not change dimensions', async () => {
    const out = await img(fixture).flop().toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(150)
  })
})

describe('crop', () => {
  it('extracts a region', async () => {
    const out = await img(fixture).crop({ left: 10, top: 10, width: 80, height: 60 }).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(80)
    expect(meta.height).toBe(60)
  })
})

describe('blur / sharpen / median', () => {
  it('blur returns same dimensions', async () => {
    const out = await img(fixture).blur(2).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(200)
  })

  it('sharpen returns same dimensions', async () => {
    const out = await img(fixture).sharpen({ sigma: 1 }).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(200)
  })

  it('median returns same dimensions', async () => {
    const out = await img(fixture).median(3).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(200)
  })
})

describe('metadata (meta)', () => {
  it('reads width and height without processing', async () => {
    const meta = await img(fixture).meta()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(150)
    expect(meta.format).toBe('jpeg')
  })

  it('reads PNG metadata', async () => {
    const meta = await img(fixturePng).meta()
    expect(meta.format).toBe('png')
    expect(meta.hasAlpha).toBe(true)
  })
})

describe('toBuffer', () => {
  it('returns a Buffer in Node', async () => {
    const out = await img(fixture).toBuffer()
    expect(out).toBeInstanceOf(Buffer)
    expect((out as Buffer).length).toBeGreaterThan(0)
  })
})

describe('toDataURL', () => {
  it('returns a base64 data URI', async () => {
    const url = await img(fixture).webp({ quality: 50 }).toDataURL()
    expect(url).toMatch(/^data:image\/webp;base64,/)
  })
})

describe('toStream', () => {
  it('returns a ReadableStream', async () => {
    const stream = await img(fixture).toStream()
    expect(stream).toBeInstanceOf(ReadableStream)
    const reader = stream.getReader()
    const { value } = await reader.read()
    expect(value).toBeInstanceOf(Uint8Array)
  })
})

describe('chaining', () => {
  it('chains multiple ops and produces correct output', async () => {
    const out = await img(fixture)
      .resize(120, 90)
      .grayscale()
      .webp({ quality: 70 })
      .toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(120)
    expect(meta.height).toBe(90)
    expect(meta.format).toBe('webp')
  })
})
