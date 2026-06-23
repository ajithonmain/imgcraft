import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'node:crypto'
import { readdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { batch } from './batch.js'
import { Pipeline } from './pipeline.js'

// --- Fixtures ---

async function makePng(width = 100, height = 100): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 150, b: 200 } },
  })
    .png()
    .toBuffer()
}

async function tempDir(): Promise<string> {
  const dir = join(tmpdir(), `imgcraft-batch-test-${randomBytes(6).toString('hex')}`)
  return dir
}

// --- Tests ---

describe('batch().toBuffers()', () => {
  it('processes all inputs and returns one result per input', async () => {
    const buffers = await Promise.all([makePng(), makePng(), makePng()])
    const results = await batch(buffers).toBuffers()

    expect(results).toHaveLength(3)
    for (const r of results) {
      expect(r.error).toBeUndefined()
      expect(r.buffer.byteLength).toBeGreaterThan(0)
    }
  })

  it('applies ops to every input (resize + format spot-check)', async () => {
    const input = await makePng(200, 200)
    const [result] = await batch([input]).resize(50, 50).webp({ quality: 80 }).toBuffers()

    expect(result!.error).toBeUndefined()
    const meta = await sharp(result!.buffer).metadata()
    expect(meta.width).toBe(50)
    expect(meta.height).toBe(50)
    expect(meta.format).toBe('webp')
  })

  it('returns the original ImageInput reference in each result', async () => {
    const inputs = [await makePng(), await makePng()]
    const results = await batch(inputs).toBuffers()

    expect(results[0]!.input).toBe(inputs[0])
    expect(results[1]!.input).toBe(inputs[1])
  })
})

describe('batch().toDir()', () => {
  let dir: string

  beforeEach(async () => {
    dir = await tempDir()
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('creates output directory and writes one file per input', async () => {
    const inputs = ['photo-a.png', 'photo-b.jpg']
    // Spy toBuffer to avoid real file reads; just return a small PNG buffer
    const png = await makePng(10, 10)
    vi.spyOn(Pipeline.prototype, 'toBuffer').mockResolvedValue(png)

    await batch(inputs).toDir(dir)

    const files = await readdir(dir)
    expect(files).toHaveLength(2)
    vi.restoreAllMocks()
  })

  it('uses default naming: original basename + output format extension', async () => {
    const inputs = ['images/hero.jpg']
    const png = await makePng(10, 10)
    vi.spyOn(Pipeline.prototype, 'toBuffer').mockResolvedValue(png)

    await batch(inputs).webp().toDir(dir)

    const files = await readdir(dir)
    expect(files).toContain('hero.webp')
    vi.restoreAllMocks()
  })

  it('uses custom naming function when provided', async () => {
    const inputs = ['a.png', 'b.png']
    const png = await makePng(10, 10)
    vi.spyOn(Pipeline.prototype, 'toBuffer').mockResolvedValue(png)

    await batch(inputs).toDir(dir, (_input, i) => `custom-${i}.png`)

    const files = await readdir(dir)
    expect(files).toContain('custom-0.png')
    expect(files).toContain('custom-1.png')
    vi.restoreAllMocks()
  })
})

describe('batch() concurrency', () => {
  it('limits concurrent executions to the specified concurrency', async () => {
    let concurrent = 0
    let maxConcurrent = 0

    vi.spyOn(Pipeline.prototype, 'toBuffer').mockImplementation(async () => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise((r) => setTimeout(r, 20))
      concurrent--
      return Buffer.alloc(1)
    })

    const inputs = new Array<Buffer>(6).fill(Buffer.alloc(0))
    await batch(inputs, { concurrency: 2 }).toBuffers()

    expect(maxConcurrent).toBeLessThanOrEqual(2)
    expect(maxConcurrent).toBeGreaterThanOrEqual(1)

    vi.restoreAllMocks()
  })
})

describe('batch() onProgress', () => {
  it('fires after each completed item with correct counts', async () => {
    const calls: Array<[number, number, string]> = []
    const png = await makePng(10, 10)
    vi.spyOn(Pipeline.prototype, 'toBuffer').mockResolvedValue(png)

    const inputs = ['a.png', 'b.png', 'c.png']
    await batch(inputs, {
      onProgress: (done, total, file) => {
        calls.push([done, total, file])
      },
    }).toBuffers()

    expect(calls).toHaveLength(3)
    expect(calls.map(([d]) => d)).toEqual([1, 2, 3])
    expect(calls.every(([, total]) => total === 3)).toBe(true)

    vi.restoreAllMocks()
  })
})

describe('batch() onError: skip', () => {
  it('collects error for bad input and still processes good inputs', async () => {
    const goodPng = await makePng(50, 50)

    // First input is bad (not a valid image), rest are good buffers
    const inputs: Buffer[] = [Buffer.from('not-an-image'), goodPng, goodPng]
    const results = await batch(inputs, { onError: 'skip' }).toBuffers()

    expect(results).toHaveLength(3)
    expect(results[0]!.error).toBeDefined()
    expect(results[0]!.error?.code).toBe('BATCH_ITEM_FAILED')
    expect(results[1]!.error).toBeUndefined()
    expect(results[2]!.error).toBeUndefined()
    expect(results[1]!.buffer.byteLength).toBeGreaterThan(0)
  })

  it('fires onProgress for errored items too', async () => {
    const calls: number[] = []
    const inputs = [Buffer.from('bad'), await makePng(10, 10)]

    await batch(inputs, {
      onError: 'skip',
      onProgress: (done) => calls.push(done),
    }).toBuffers()

    expect(calls).toHaveLength(2)
  })
})

describe('batch() onError: throw (default)', () => {
  it('throws on first bad input', async () => {
    const inputs = [Buffer.from('not-an-image')]
    await expect(batch(inputs).toBuffers()).rejects.toThrow()
  })

  it('aborts remaining queue items when one input fails', async () => {
    let processed = 0

    vi.spyOn(Pipeline.prototype, 'toBuffer').mockImplementation(async function () {
      processed++
      if (processed === 1) throw new Error('simulated failure')
      await new Promise((r) => setTimeout(r, 50))
      return Buffer.alloc(1)
    })

    const inputs = new Array<Buffer>(4).fill(Buffer.alloc(0))
    await expect(
      batch(inputs, { concurrency: 1 }).toBuffers(),
    ).rejects.toThrow()

    // With concurrency 1, first item fails — remaining items never started
    expect(processed).toBe(1)

    vi.restoreAllMocks()
  })
})

describe('batch().toFiles()', () => {
  let dir: string

  beforeEach(async () => {
    const { mkdir } = await import('node:fs/promises')
    dir = await tempDir()
    await mkdir(dir, { recursive: true })
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('throws when paths.length does not match inputs.length', async () => {
    const inputs = [await makePng(), await makePng()]
    await expect(
      batch(inputs).toFiles([join(dir, 'only-one.png')]),
    ).rejects.toMatchObject({ code: 'BATCH_PATH_MISMATCH' })
  })

  it('writes each result to the corresponding path', async () => {
    const png = await makePng(10, 10)
    vi.spyOn(Pipeline.prototype, 'toBuffer').mockResolvedValue(png)

    const paths = [join(dir, 'out-0.png'), join(dir, 'out-1.png')]
    await batch([Buffer.alloc(0), Buffer.alloc(0)]).toFiles(paths)

    const files = await readdir(dir)
    expect(files).toContain('out-0.png')
    expect(files).toContain('out-1.png')

    vi.restoreAllMocks()
  })
})
