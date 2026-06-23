import { describe, it, expect, beforeAll, vi } from 'vitest'
import sharp from 'sharp'
import { wasmEngine } from './engines/wasm.js'
import { img, ImgCraftError } from './index.js'

// Force all Pipeline calls through the WASM engine by mocking getEngine()
vi.mock('./adapters/runtime.js', () => ({
  getEngine: async () => wasmEngine,
}))

let fixture: Buffer
let fixturePng: Buffer

beforeAll(async () => {
  fixture = await sharp({
    create: { width: 200, height: 150, channels: 3, background: { r: 100, g: 80, b: 60 } },
  })
    .jpeg()
    .toBuffer()

  fixturePng = await sharp({
    create: { width: 100, height: 80, channels: 3, background: { r: 200, g: 50, b: 10 } },
  })
    .png()
    .toBuffer()
})

describe('WASM engine — resize', () => {
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
    // 150/200 * 50 = 37.5 → 38
    expect(meta.height).toBe(38)
  })
})

describe('WASM engine — format convert', () => {
  it('converts to JPEG', async () => {
    const out = await img(fixturePng).jpeg({ quality: 80 }).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.format).toBe('jpeg')
  })

  it('converts to PNG', async () => {
    const out = await img(fixture).png().toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.format).toBe('png')
  })

  it('converts to WebP', async () => {
    const out = await img(fixture).webp({ quality: 75 }).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.format).toBe('webp')
  })

  it('avif falls back to webp with a console.warn', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const out = await img(fixture).avif({ quality: 60 }).toBuffer()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('avif'))
    const meta = await sharp(out as Buffer).metadata()
    // Falls back to webp
    expect(meta.format).toBe('webp')
    warnSpy.mockRestore()
  })
})

describe('WASM engine — grayscale', () => {
  it('produces a grayscale image', async () => {
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

describe('WASM engine — flip / flop', () => {
  it('flip does not change dimensions', async () => {
    const out = await img(fixture).flip().jpeg().toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(150)
  })

  it('flop does not change dimensions', async () => {
    const out = await img(fixture).flop().jpeg().toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(150)
  })
})

describe('WASM engine — crop', () => {
  it('extracts a region', async () => {
    const out = await img(fixture).crop({ left: 10, top: 10, width: 80, height: 60 }).jpeg().toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(80)
    expect(meta.height).toBe(60)
  })
})

describe('WASM engine — unsupported ops warn, not throw', () => {
  it('blur warns and continues', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(img(fixture).blur(2).jpeg().toBuffer()).resolves.toBeDefined()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('blur'))
    warnSpy.mockRestore()
  })

  it('sharpen warns and continues', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(img(fixture).sharpen({ sigma: 1 }).jpeg().toBuffer()).resolves.toBeDefined()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('sharpen'))
    warnSpy.mockRestore()
  })

  it('composite warns and continues', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const overlay = await sharp({
      create: { width: 20, height: 20, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } },
    })
      .png()
      .toBuffer()
    await expect(img(fixture).composite({ input: overlay }).jpeg().toBuffer()).resolves.toBeDefined()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('composite'))
    warnSpy.mockRestore()
  })
})

describe('WASM engine — toBuffer', () => {
  it('returns a Uint8Array', async () => {
    const out = await img(fixture).toBuffer()
    expect(out).toBeInstanceOf(Uint8Array)
    expect(out.length).toBeGreaterThan(0)
  })
})

describe('WASM engine — toDataURL', () => {
  it('returns a base64 data URI', async () => {
    const url = await img(fixture).webp({ quality: 50 }).toDataURL()
    expect(url).toMatch(/^data:image\/webp;base64,/)
    // Validate it is actually decodable base64
    const base64Part = url.split(',')[1]!
    expect(() => atob(base64Part)).not.toThrow()
  })
})

describe('WASM engine — metadata', () => {
  it('reads width and height', async () => {
    const meta = await img(fixture).meta()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(150)
  })
})

describe('WASM engine — chaining', () => {
  it('chains resize + grayscale + format', async () => {
    const out = await img(fixture).resize(80, 60).grayscale().webp({ quality: 60 }).toBuffer()
    const meta = await sharp(out as Buffer).metadata()
    expect(meta.width).toBe(80)
    expect(meta.height).toBe(60)
    expect(meta.format).toBe('webp')
  })
})
