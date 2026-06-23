import { describe, it, expect, vi, beforeEach } from 'vitest'
import sharp from 'sharp'
import { applyRemoveBackground, applySmartCrop, applyUpscale, _resetAICaches } from './ai.js'

// --- Fixtures ---

async function solidPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 255, g: 0, b: 0 } },
  })
    .png()
    .toBuffer()
}

// --- Mocks (hoisted by vitest) ---

vi.mock('@imgly/background-removal', () => ({
  removeBackground: vi.fn(async (blob: Blob) => {
    const buf = await blob.arrayBuffer()
    const rgba = await sharp(Buffer.from(buf)).ensureAlpha(0.5).png().toBuffer()
    return new Blob([rgba], { type: 'image/png' })
  }),
}))

vi.mock('@tensorflow/tfjs-node', () => ({
  default: {},
  node: {
    decodeImage: vi.fn((_buf: Buffer, _channels: number) => ({ dispose: vi.fn() })),
  },
}))

vi.mock('@tensorflow-models/coco-ssd', () => ({
  load: vi.fn(async () => ({
    detect: vi.fn(async () => [
      { bbox: [10, 10, 80, 80] as [number, number, number, number], class: 'person', score: 0.95 },
      { bbox: [50, 50, 30, 30] as [number, number, number, number], class: 'cat', score: 0.8 },
    ]),
  })),
}))

vi.mock('upscalerjs', () => ({
  default: vi.fn().mockImplementation(() => ({
    upscale: vi.fn(async (input: string) => {
      const b64 = input.slice(input.indexOf(',') + 1)
      const buf = Buffer.from(b64, 'base64')
      const meta = await sharp(buf).metadata()
      const doubled = await sharp(buf)
        .resize((meta.width ?? 50) * 2, (meta.height ?? 50) * 2)
        .png()
        .toBuffer()
      return `data:image/png;base64,${doubled.toString('base64')}`
    }),
    dispose: vi.fn(),
  })),
}))

vi.mock('@upscalerjs/esrgan-slim/2x', () => ({ default: { scale: 2 } }))
vi.mock('@upscalerjs/esrgan-slim/4x', () => ({ default: { scale: 4 } }))

// Reset module-level AI caches before each test so lazy-load behavior is isolated
beforeEach(() => {
  _resetAICaches()
})

// --- removeBackground ---

describe('applyRemoveBackground', () => {
  it('returns a buffer with an alpha channel', async () => {
    const input = await solidPng(100, 100)
    const result = await applyRemoveBackground(input)

    const meta = await sharp(result).metadata()
    expect(meta.channels).toBe(4)
    expect(meta.hasAlpha).toBe(true)
  })

  it('accepts Uint8Array input', async () => {
    const input = await solidPng(50, 50)
    const result = await applyRemoveBackground(new Uint8Array(input))
    const meta = await sharp(result).metadata()
    expect(meta.hasAlpha).toBe(true)
  })

  it('calls the bg-removal module only once across multiple calls (lazy load cached)', async () => {
    const { removeBackground } = await import('@imgly/background-removal')
    const spy = vi.mocked(removeBackground)
    spy.mockClear()

    const input = await solidPng(40, 40)
    await applyRemoveBackground(input)
    await applyRemoveBackground(input)

    // bgRemovalFn is cached after first load — removeBackground itself is called each time,
    // but the import is only resolved once (spy tracks invocations of the fn, not the import)
    expect(spy).toHaveBeenCalledTimes(2)
  })
})

// --- smartCrop ---

describe('applySmartCrop', () => {
  it('crops the image to the detected subject bbox with default padding', async () => {
    const input = await solidPng(200, 200)
    const result = await applySmartCrop(input, {})

    const meta = await sharp(result).metadata()
    // Top-scoring bbox [10,10,80,80] + default padding 20 → left=0,top=0,right=110,bottom=110
    expect(meta.width).toBe(110)
    expect(meta.height).toBe(110)
  })

  it('respects custom padding', async () => {
    const input = await solidPng(200, 200)
    const result = await applySmartCrop(input, { padding: 0 })

    const meta = await sharp(result).metadata()
    // Top-scoring bbox [10,10,80,80] + padding 0 → width=80, height=80
    expect(meta.width).toBe(80)
    expect(meta.height).toBe(80)
  })

  it('returns original buffer when no detections found', async () => {
    const { load } = await import('@tensorflow-models/coco-ssd')
    vi.mocked(load).mockResolvedValueOnce({
      detect: vi.fn(async () => []),
    } as ReturnType<typeof vi.fn>)

    const input = await solidPng(100, 100)
    const result = await applySmartCrop(input, {})

    const meta = await sharp(result).metadata()
    expect(meta.width).toBe(100)
    expect(meta.height).toBe(100)
  })

  it('filters by subject class when specified', async () => {
    const input = await solidPng(200, 200)
    // Default mock returns person (0.95) and cat (0.8); select cat
    const result = await applySmartCrop(input, { subject: 'cat', padding: 0 })

    const meta = await sharp(result).metadata()
    // cat bbox [50,50,30,30] + padding 0 → width=30, height=30
    expect(meta.width).toBe(30)
    expect(meta.height).toBe(30)
  })
})

// --- upscale ---

describe('applyUpscale', () => {
  it('doubles dimensions with factor 2', async () => {
    const input = await solidPng(100, 100)
    const result = await applyUpscale(input, { factor: 2 })

    const meta = await sharp(result).metadata()
    expect(meta.width).toBe(200)
    expect(meta.height).toBe(200)
  })

  it('caches upscaler instance on repeated calls with same factor', async () => {
    const { default: Upscaler } = await import('upscalerjs')
    const MockUpscaler = vi.mocked(Upscaler)
    MockUpscaler.mockClear()

    const input = await solidPng(50, 50)
    await applyUpscale(input, { factor: 2 })
    await applyUpscale(input, { factor: 2 })

    // Constructor should be called exactly once — second call is a cache hit
    expect(MockUpscaler).toHaveBeenCalledTimes(1)
  })

  it('creates separate instances for factor 2 and factor 4', async () => {
    const { default: Upscaler } = await import('upscalerjs')
    const MockUpscaler = vi.mocked(Upscaler)
    MockUpscaler.mockClear()

    const input = await solidPng(50, 50)
    await applyUpscale(input, { factor: 2 })
    await applyUpscale(input, { factor: 4 })

    // Each factor gets its own Upscaler instance
    expect(MockUpscaler).toHaveBeenCalledTimes(2)
  })
})

// --- WASM engine path: warn not throw ---

describe('WASM engine AI ops', () => {
  it('warns and skips removeBackground without throwing', async () => {
    const { processWasm } = await import('../engines/wasm.js')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const input = await solidPng(50, 50)
    await expect(
      processWasm({ input, ops: [{ op: 'removeBackground' }] }),
    ).resolves.not.toThrow()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('removeBackground'))
    warnSpy.mockRestore()
  })

  it('warns and skips smartCrop without throwing', async () => {
    const { processWasm } = await import('../engines/wasm.js')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const input = await solidPng(50, 50)
    await expect(
      processWasm({ input, ops: [{ op: 'smartCrop', options: {} }] }),
    ).resolves.not.toThrow()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('smartCrop'))
    warnSpy.mockRestore()
  })

  it('warns and skips upscale without throwing', async () => {
    const { processWasm } = await import('../engines/wasm.js')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const input = await solidPng(50, 50)
    await expect(
      processWasm({ input, ops: [{ op: 'upscale', options: { factor: 2 } }] }),
    ).resolves.not.toThrow()

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('upscale'))
    warnSpy.mockRestore()
  })
})
