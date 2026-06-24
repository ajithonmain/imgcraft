import { getEngine } from './adapters/runtime.js'

// btoa is available in Node 16+ and all modern browsers
function uint8ToBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}
import { ImgCraftError } from './types.js'
import type {
  ImageInput,
  PipelineState,
  PipelineOp,
  MetadataResult,
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
  CompressOptions,
} from './types.js'

export class Pipeline {
  private readonly _state: PipelineState

  constructor(input: ImageInput, ops: PipelineOp[] = []) {
    this._state = { input, ops: [...ops] }
  }

  private push(op: PipelineOp): this {
    this._state.ops.push(op)
    return this
  }

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
    if (value < 1 || value > 100) {
      throw new ImgCraftError({
        code: 'INVALID_QUALITY',
        message: `Quality must be between 1 and 100. Got: ${value}`,
      })
    }
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

  compress(options?: CompressOptions): this {
    return this.push({ op: 'compress', options: options ?? {} })
  }

  async meta(): Promise<MetadataResult> {
    const engine = await getEngine()
    return engine.metadata(this._state.input)
  }

  async toBuffer(): Promise<Buffer | Uint8Array> {
    const engine = await getEngine()
    const result = await engine.process(this._state)
    return result.data
  }

  async toFile(path: string): Promise<void> {
    const { writeFile } = await import('node:fs/promises')
    const data = await this.toBuffer()
    await writeFile(path, data)
  }

  async toStream(): Promise<ReadableStream<Uint8Array>> {
    const data = await this.toBuffer()
    const chunk = data instanceof Uint8Array ? data : new Uint8Array(data)
    return new ReadableStream({
      start(controller) {
        controller.enqueue(chunk)
        controller.close()
      },
    })
  }

  async toDataURL(): Promise<string> {
    const engine = await getEngine()
    const result = await engine.process(this._state)
    const base64 = uint8ToBase64(
      result.data instanceof Uint8Array ? result.data : new Uint8Array(result.data),
    )
    return `data:image/${result.format};base64,${base64}`
  }
}
