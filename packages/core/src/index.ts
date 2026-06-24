import { Pipeline } from './pipeline.js'
import type { ImageInput } from './types.js'

export function img(input: ImageInput): Pipeline {
  return new Pipeline(input)
}

export { batch, Batch } from './batch.js'
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
  SmartCropOptions,
  UpscaleOptions,
  CompressOptions,
} from './types.js'
export type { BatchResult, BatchOptions } from './batch.js'
