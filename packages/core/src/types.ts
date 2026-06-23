export type ImageInput = string | Buffer | Uint8Array | ArrayBuffer | URL

export type FitMode = 'cover' | 'contain' | 'fill' | 'inside' | 'outside'

export type OutputFormat = 'jpeg' | 'png' | 'webp' | 'avif' | 'tiff'

export type BlendMode =
  | 'over'
  | 'multiply'
  | 'screen'
  | 'darken'
  | 'lighten'
  | 'overlay'
  | 'add'
  | 'dest-out'

export type Gravity =
  | 'center'
  | 'north'
  | 'northeast'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'
  | 'northwest'

export interface RgbaColor {
  r: number
  g: number
  b: number
  alpha?: number
}

export interface ResizeOptions {
  width?: number
  height?: number
  fit?: FitMode
  background?: string | RgbaColor
  withoutEnlargement?: boolean
}

export interface CropOptions {
  left: number
  top: number
  width: number
  height: number
}

export interface RotateOptions {
  angle: number
  background?: string | RgbaColor
}

export interface FormatOptions {
  format: OutputFormat
  quality?: number
}

export interface BlurOptions {
  sigma?: number
}

export interface SharpenOptions {
  sigma?: number
  m1?: number
  m2?: number
}

export interface MedianOptions {
  size?: number
}

export interface TintOptions {
  r: number
  g: number
  b: number
}

export interface ModulateOptions {
  brightness?: number
  saturation?: number
  hue?: number
}

export interface ContrastOptions {
  value: number
}

export interface CompositeOptions {
  input: string | Buffer | Uint8Array
  blend?: BlendMode
  top?: number
  left?: number
  gravity?: Gravity
}

export interface MetadataResult {
  width?: number
  height?: number
  format?: string
  size?: number
  channels?: number
  hasAlpha?: boolean
  orientation?: number
  density?: number
  isProgressive?: boolean
}

export interface EngineResult {
  data: Buffer | Uint8Array
  format: string
  width: number
  height: number
}

export type PipelineOp =
  | { op: 'resize'; options: ResizeOptions }
  | { op: 'crop'; options: CropOptions }
  | { op: 'rotate'; options: RotateOptions }
  | { op: 'flip' }
  | { op: 'flop' }
  | { op: 'format'; options: FormatOptions }
  | { op: 'quality'; value: number }
  | { op: 'blur'; options: BlurOptions }
  | { op: 'sharpen'; options: SharpenOptions }
  | { op: 'median'; options: MedianOptions }
  | { op: 'grayscale' }
  | { op: 'tint'; options: TintOptions }
  | { op: 'negate' }
  | { op: 'brightness'; options: Pick<ModulateOptions, 'brightness'> }
  | { op: 'saturation'; options: Pick<ModulateOptions, 'saturation'> }
  | { op: 'contrast'; options: ContrastOptions }
  | { op: 'composite'; options: CompositeOptions }
  | { op: 'stripMeta' }

export interface PipelineState {
  input: ImageInput
  ops: PipelineOp[]
}

export interface ImgCraftErrorOptions {
  code: string
  message: string
}

export class ImgCraftError extends Error {
  readonly code: string

  constructor({ code, message }: ImgCraftErrorOptions) {
    super(message)
    this.name = 'ImgCraftError'
    this.code = code
  }
}
