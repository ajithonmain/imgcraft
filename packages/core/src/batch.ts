import { Pipeline } from './pipeline.js'
import { ImgCraftError } from './types.js'
import type {
  ImageInput,
  PipelineOp,
  ResizeOptions,
  CropOptions,
  RotateOptions,
  FormatOptions,
  OutputFormat,
  BlurOptions,
  SharpenOptions,
  MedianOptions,
  TintOptions,
  CompositeOptions,
  ContrastOptions,
  SmartCropOptions,
  UpscaleOptions,
} from './types.js'

export interface BatchOptions {
  concurrency?: number
  onProgress?: (done: number, total: number, file: string) => void
  onError?: 'skip' | 'throw'
}

export interface BatchResult {
  input: ImageInput
  buffer: Buffer
  error?: ImgCraftError
}

function inputLabel(input: ImageInput, index: number): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.pathname
  return `input[${index}]`
}

function wrapError(err: unknown): ImgCraftError {
  return err instanceof ImgCraftError
    ? err
    : new ImgCraftError({
        code: 'BATCH_ITEM_FAILED',
        message: err instanceof Error ? err.message : String(err),
      })
}

export class Batch {
  private readonly _inputs: ImageInput[]
  private readonly _options: BatchOptions
  private readonly _ops: PipelineOp[]

  constructor(inputs: ImageInput[], options?: BatchOptions) {
    this._inputs = inputs
    this._options = options ?? {}
    this._ops = []
  }

  private push(op: PipelineOp): this {
    this._ops.push(op)
    return this
  }

  // --- Transform methods (mirror Pipeline) ---

  resize(width?: number, height?: number, options?: Omit<ResizeOptions, 'width' | 'height'>): this {
    return this.push({ op: 'resize', options: { width, height, ...options } })
  }

  crop(options: CropOptions): this {
    return this.push({ op: 'crop', options })
  }

  rotate(angle: number, options?: Omit<RotateOptions, 'angle'>): this {
    return this.push({ op: 'rotate', options: { angle, ...options } })
  }

  flip(): this {
    return this.push({ op: 'flip' })
  }

  flop(): this {
    return this.push({ op: 'flop' })
  }

  format(type: OutputFormat, options?: Omit<FormatOptions, 'format'>): this {
    return this.push({ op: 'format', options: { format: type, ...options } })
  }

  jpeg(options?: { quality?: number }): this {
    return this.format('jpeg', options)
  }

  png(options?: { quality?: number }): this {
    return this.format('png', options)
  }

  webp(options?: { quality?: number }): this {
    return this.format('webp', options)
  }

  avif(options?: { quality?: number }): this {
    return this.format('avif', options)
  }

  quality(value: number): this {
    return this.push({ op: 'quality', value })
  }

  blur(sigma?: number): this {
    const options: BlurOptions = sigma !== undefined ? { sigma } : {}
    return this.push({ op: 'blur', options })
  }

  sharpen(options?: SharpenOptions): this {
    return this.push({ op: 'sharpen', options: options ?? {} })
  }

  median(size?: number): this {
    const options: MedianOptions = size !== undefined ? { size } : {}
    return this.push({ op: 'median', options })
  }

  grayscale(): this {
    return this.push({ op: 'grayscale' })
  }

  tint(options: TintOptions): this {
    return this.push({ op: 'tint', options })
  }

  negate(): this {
    return this.push({ op: 'negate' })
  }

  brightness(value: number): this {
    return this.push({ op: 'brightness', options: { brightness: value } })
  }

  saturation(value: number): this {
    return this.push({ op: 'saturation', options: { saturation: value } })
  }

  contrast(options: ContrastOptions): this {
    return this.push({ op: 'contrast', options })
  }

  composite(options: CompositeOptions): this {
    return this.push({ op: 'composite', options })
  }

  stripMeta(): this {
    return this.push({ op: 'stripMeta' })
  }

  removeBackground(): this {
    return this.push({ op: 'removeBackground' })
  }

  smartCrop(options?: SmartCropOptions): this {
    return this.push({ op: 'smartCrop', options: options ?? {} })
  }

  upscale(options: UpscaleOptions): this {
    return this.push({ op: 'upscale', options })
  }

  // --- Internal: format extension from ops (for default file naming) ---

  private _outputExt(): string {
    for (let i = this._ops.length - 1; i >= 0; i--) {
      const op = this._ops[i]
      if (op !== undefined && op.op === 'format') return op.options.format
    }
    return 'png'
  }

  private _defaultName(
    input: ImageInput,
    index: number,
    basename: (p: string, ext?: string) => string,
    extname: (p: string) => string,
  ): string {
    const ext = this._outputExt()
    if (typeof input === 'string') {
      return `${basename(input, extname(input))}.${ext}`
    }
    if (input instanceof URL) {
      return `${basename(input.pathname, extname(input.pathname))}.${ext}`
    }
    return `image-${index}.${ext}`
  }

  // --- Execution engine ---

  private async _execute(): Promise<BatchResult[]> {
    const { default: PQueue } = await import('p-queue')
    const queue = new PQueue({ concurrency: this._options.concurrency ?? 4 })

    const results: Array<BatchResult | undefined> = new Array(this._inputs.length).fill(undefined)
    let done = 0
    let abortError: ImgCraftError | null = null

    for (const [index, input] of this._inputs.entries()) {
      // void: queue.clear() drops pending tasks whose add() promises never settle;
      // queue.onIdle() below is the correct completion signal instead.
      void queue.add(async () => {
        if (abortError !== null) return

        let buffer: Buffer
        try {
          const pipeline = new Pipeline(input, this._ops)
          const data = await pipeline.toBuffer()
          buffer = data instanceof Buffer ? data : Buffer.from(data)
        } catch (err) {
          const error = wrapError(err)
          if (this._options.onError === 'skip') {
            results[index] = { input, buffer: Buffer.alloc(0), error }
            done++
            this._options.onProgress?.(done, this._inputs.length, inputLabel(input, index))
          } else {
            abortError ??= error
            queue.clear()
          }
          return
        }

        results[index] = { input, buffer }
        done++
        this._options.onProgress?.(done, this._inputs.length, inputLabel(input, index))
      })
    }

    await queue.onIdle()

    if (abortError !== null) throw abortError

    return results as BatchResult[]
  }

  // --- Output methods ---

  async toBuffers(): Promise<BatchResult[]> {
    return this._execute()
  }

  async toDir(
    outputDir: string,
    naming?: (input: ImageInput, index: number) => string,
  ): Promise<void> {
    const { writeFile, mkdir } = await import('node:fs/promises')
    const path = await import('node:path')

    await mkdir(outputDir, { recursive: true })

    const results = await this._execute()

    await Promise.all(
      results.map(async ({ input, buffer, error }, index) => {
        if (error !== undefined) return
        const filename =
          naming !== undefined
            ? naming(input, index)
            : this._defaultName(input, index, path.basename, path.extname)
        await writeFile(path.join(outputDir, filename), buffer)
      }),
    )
  }

  async toFiles(paths: string[]): Promise<void> {
    if (paths.length !== this._inputs.length) {
      throw new ImgCraftError({
        code: 'BATCH_PATH_MISMATCH',
        message: `paths.length (${paths.length}) must equal inputs.length (${this._inputs.length})`,
      })
    }

    const { writeFile } = await import('node:fs/promises')

    const results = await this._execute()

    await Promise.all(
      results.map(async ({ buffer, error }, index) => {
        if (error !== undefined) return
        await writeFile(paths[index]!, buffer)
      }),
    )
  }
}

export function batch(inputs: ImageInput[], options?: BatchOptions): Batch {
  return new Batch(inputs, options)
}
