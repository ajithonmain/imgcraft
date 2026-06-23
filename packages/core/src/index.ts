import { Pipeline } from './pipeline.js'
import { ImgCraftError } from './types.js'
import type { ImageInput } from './types.js'

export function img(input: ImageInput): Pipeline {
  return new Pipeline(input)
}

export function batch(_inputs: ImageInput[]): never {
  throw new ImgCraftError({
    code: 'BATCH_NOT_IMPLEMENTED',
    message: 'batch() is not yet implemented. Coming in Phase 4.',
  })
}

export { Pipeline } from './pipeline.js'
export { ImgCraftError } from './types.js'
export type {
  ImageInput,
  FitMode,
  OutputFormat,
  BlendMode,
  Gravity,
  RgbaColor,
  ResizeOptions,
  CropOptions,
  RotateOptions,
  FormatOptions,
  BlurOptions,
  SharpenOptions,
  MedianOptions,
  TintOptions,
  ModulateOptions,
  ContrastOptions,
  CompositeOptions,
  MetadataResult,
  EngineResult,
  PipelineState,
  PipelineOp,
} from './types.js'
