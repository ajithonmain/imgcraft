import type { SharpenOptions as SharpSharpenOptions, FormatEnum } from 'sharp'
import { ImgCraftError } from '../types.js'
import type {
  PipelineState,
  MetadataResult,
  EngineResult,
  ImageInput,
  PipelineOp,
  CompressOptions,
} from '../types.js'
import {
  applyRemoveBackground,
  applySmartCrop,
  applyUpscale,
} from '../transforms/ai.js'
import { applyCompress } from '../transforms/format.js'

type SharpConstructor = Awaited<ReturnType<typeof importSharp>>
type SharpInstance = ReturnType<SharpConstructor>

async function importSharp() {
  try {
    const mod = await import('sharp')
    return mod.default
  } catch {
    throw new ImgCraftError({
      code: 'SHARP_NOT_AVAILABLE',
      message: 'sharp is required for Node.js image processing. Install it: npm install sharp',
    })
  }
}

function toSharpInput(input: ImageInput): string | Buffer {
  if (typeof input === 'string') return input
  if (input instanceof Buffer) return input
  if (input instanceof Uint8Array) return Buffer.from(input)
  if (input instanceof ArrayBuffer) return Buffer.from(input)
  if (input instanceof URL) return input.pathname
  throw new ImgCraftError({
    code: 'INVALID_INPUT',
    message: 'Unsupported input type. Provide a file path, Buffer, Uint8Array, ArrayBuffer, or URL.',
  })
}

function applyOp(pipeline: SharpInstance, op: PipelineOp): SharpInstance {
  switch (op.op) {
    case 'resize':
      return pipeline.resize(op.options.width, op.options.height, {
        fit: op.options.fit,
        background: op.options.background,
        withoutEnlargement: op.options.withoutEnlargement,
      })

    case 'crop':
      return pipeline.extract({
        left: op.options.left,
        top: op.options.top,
        width: op.options.width,
        height: op.options.height,
      })

    case 'rotate':
      return pipeline.rotate(op.options.angle, { background: op.options.background })

    case 'flip':
      return pipeline.flip()

    case 'flop':
      return pipeline.flop()

    case 'blur':
      return pipeline.blur(op.options.sigma)

    case 'sharpen': {
      if (op.options.sigma !== undefined) {
        const opts: SharpSharpenOptions = { sigma: op.options.sigma }
        if (op.options.m1 !== undefined) opts.m1 = op.options.m1
        if (op.options.m2 !== undefined) opts.m2 = op.options.m2
        return pipeline.sharpen(opts)
      }
      return pipeline.sharpen()
    }

    case 'median':
      return pipeline.median(op.options.size)

    case 'grayscale':
      return pipeline.grayscale()

    case 'tint':
      return pipeline.tint({ r: op.options.r, g: op.options.g, b: op.options.b })

    case 'negate':
      return pipeline.negate()

    case 'brightness':
      return pipeline.modulate({ brightness: op.options.brightness })

    case 'saturation':
      return pipeline.modulate({ saturation: op.options.saturation })

    case 'contrast': {
      const c = op.options.value
      return pipeline.linear(c, -(128 * (c - 1)))
    }

    case 'composite':
      return pipeline.composite([
        {
          input: op.options.input as string | Buffer,
          blend: op.options.blend,
          top: op.options.top,
          left: op.options.left,
          gravity: op.options.gravity,
        },
      ])

    case 'stripMeta':
      return pipeline.withMetadata({})

    case 'format':
    case 'quality':
    case 'compress':
    case 'removeBackground':
    case 'smartCrop':
    case 'upscale':
      // AI ops, format/quality/compress are handled in processNode before reaching here
      return pipeline
  }
}

export async function processNode(state: PipelineState): Promise<EngineResult> {
  const sharp = await importSharp()

  let pipeline = sharp(toSharpInput(state.input))
  let pendingFormat: string | undefined
  let pendingQuality: number | undefined
  let pendingCompress: CompressOptions | undefined

  for (const op of state.ops) {
    if (op.op === 'format') {
      pendingFormat = op.options.format
      pendingQuality = op.options.quality
      pendingCompress = undefined
    } else if (op.op === 'quality') {
      pendingQuality = op.value
    } else if (op.op === 'compress') {
      pendingCompress = op.options ?? {}
      pendingFormat = undefined
      pendingQuality = undefined
    } else if (
      op.op === 'removeBackground' ||
      op.op === 'smartCrop' ||
      op.op === 'upscale'
    ) {
      // Flush current pipeline to PNG (lossless) before AI transform
      const flushed = await pipeline.png().toBuffer()

      let result: Buffer
      if (op.op === 'removeBackground') {
        result = await applyRemoveBackground(flushed)
      } else if (op.op === 'smartCrop') {
        result = await applySmartCrop(flushed, op.options)
      } else {
        result = await applyUpscale(flushed, op.options)
      }

      // Restart pipeline from AI output; pending format/quality still apply at end
      pipeline = sharp(result)
    } else {
      pipeline = applyOp(pipeline, op)
    }
  }

  if (pendingCompress !== undefined) {
    pipeline = applyCompress(pipeline, pendingCompress)
  } else if (pendingFormat !== undefined) {
    pipeline = pipeline.toFormat(
      pendingFormat as keyof FormatEnum,
      pendingQuality !== undefined ? { quality: pendingQuality } : undefined,
    )
  } else if (pendingQuality !== undefined) {
    const meta = await pipeline.metadata()
    if (meta.format !== undefined) {
      pipeline = pipeline.toFormat(meta.format as keyof FormatEnum, {
        quality: pendingQuality,
      })
    }
  }

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true })

  return {
    data,
    format: info.format,
    width: info.width,
    height: info.height,
  }
}

export async function metadataNode(input: ImageInput): Promise<MetadataResult> {
  const sharp = await importSharp()
  const meta = await sharp(toSharpInput(input)).metadata()

  return {
    width: meta.width,
    height: meta.height,
    format: meta.format,
    size: meta.size,
    channels: meta.channels,
    hasAlpha: meta.hasAlpha,
    orientation: meta.orientation,
    density: meta.density,
    isProgressive: meta.isProgressive,
  }
}

export const nodeEngine = {
  process: processNode,
  metadata: metadataNode,
}
