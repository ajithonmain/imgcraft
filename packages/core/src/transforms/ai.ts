import { ImgCraftError } from '../types.js'
import type { SmartCropOptions, UpscaleOptions } from '../types.js'

// --- Internal types for lazy-loaded AI modules ---

interface BgRemovalFn {
  (input: Blob, config?: Record<string, unknown>): Promise<Blob>
}

interface CocoSsdDetection {
  bbox: [number, number, number, number]
  class: string
  score: number
}

interface CocoSsdModel {
  detect: (input: unknown) => Promise<CocoSsdDetection[]>
}

interface UpscalerLike {
  upscale: (input: string, options?: Record<string, unknown>) => Promise<string>
  dispose: () => Promise<void>
}

// --- Module-level caches — populated on first call, never at module init ---

let bgRemovalFn: BgRemovalFn | null = null
let cocoSsdModel: CocoSsdModel | null = null
const upscalerCache = new Map<2 | 4, UpscalerLike>()

// Clears all lazy-load caches — used in tests to restore fresh state
export function _resetAICaches(): void {
  bgRemovalFn = null
  cocoSsdModel = null
  upscalerCache.clear()
}

// --- Loader helpers ---

async function loadBgRemoval(): Promise<BgRemovalFn> {
  if (bgRemovalFn !== null) return bgRemovalFn
  try {
    const mod = await import('@imgly/background-removal')
    bgRemovalFn = mod.removeBackground as BgRemovalFn
    return bgRemovalFn
  } catch (err) {
    throw new ImgCraftError({
      code: 'BG_REMOVAL_UNAVAILABLE',
      message: `@imgly/background-removal failed to load: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
}

async function loadCocoSsd(): Promise<CocoSsdModel> {
  if (cocoSsdModel !== null) return cocoSsdModel
  try {
    // tfjs-node must be loaded first to register the Node backend
    await import('@tensorflow/tfjs-node')
    const cocoSsd = await import('@tensorflow-models/coco-ssd')
    cocoSsdModel = (await cocoSsd.load()) as CocoSsdModel
    return cocoSsdModel
  } catch (err) {
    throw new ImgCraftError({
      code: 'SMART_CROP_UNAVAILABLE',
      message: `@tensorflow-models/coco-ssd failed to load: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
}

async function loadUpscaler(factor: 2 | 4): Promise<UpscalerLike> {
  const cached = upscalerCache.get(factor)
  if (cached !== undefined) return cached

  try {
    await import('@tensorflow/tfjs-node')
    const { default: Upscaler } = (await import('upscalerjs') as unknown) as {
      default: new (options: Record<string, unknown>) => UpscalerLike
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const model =
      factor === 2
        ? ((await import('@upscalerjs/esrgan-slim/2x')) as { default: unknown }).default
        : ((await import('@upscalerjs/esrgan-slim/4x')) as { default: unknown }).default

    const instance = new Upscaler({ model })
    upscalerCache.set(factor, instance)
    return instance
  } catch (err) {
    throw new ImgCraftError({
      code: 'UPSCALE_UNAVAILABLE',
      message: `upscalerjs failed to load: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
}

// --- Public transform functions ---

// Max dimension for background removal. The ONNX model works at low resolution
// internally anyway; feeding it a 4K image inflates memory ~6× with no quality gain.
const BG_REMOVAL_MAX_DIM = 1024

export async function applyRemoveBackground(input: Buffer | Uint8Array): Promise<Buffer> {
  const removeBg = await loadBgRemoval()
  const sharpMod = await import('sharp')
  const sharp = sharpMod.default

  const src = input instanceof Buffer ? input : Buffer.from(input)

  // Resize down before background removal to stay within server memory limits.
  const meta = await sharp(src).metadata()
  const maxDim = Math.max(meta.width ?? 0, meta.height ?? 0)
  const resized =
    maxDim > BG_REMOVAL_MAX_DIM
      ? await sharp(src).resize(BG_REMOVAL_MAX_DIM, BG_REMOVAL_MAX_DIM, { fit: 'inside' }).png().toBuffer()
      : src

  const bytes = Uint8Array.from(resized)
  const blob = new Blob([bytes], { type: 'image/png' })

  try {
    const result = await removeBg(blob)
    const arrayBuffer = await result.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (err) {
    throw new ImgCraftError({
      code: 'BG_REMOVAL_FAILED',
      message: `Background removal failed: ${err instanceof Error ? err.message : String(err)}`,
    })
  }
}

export async function applySmartCrop(
  input: Buffer | Uint8Array,
  options: SmartCropOptions,
): Promise<Buffer> {
  const model = await loadCocoSsd()
  const tf = (await import('@tensorflow/tfjs-node')) as {
    node: { decodeImage: (buf: Buffer, channels?: number) => { dispose: () => void } & object }
  }

  const buffer = input instanceof Buffer ? input : Buffer.from(input)

  // Get image dimensions via sharp (already a dep in node engine context)
  const sharpMod = await import('sharp')
  const sharp = sharpMod.default
  const meta = await sharp(buffer).metadata()
  const imgWidth = meta.width ?? 0
  const imgHeight = meta.height ?? 0

  const tensor = tf.node.decodeImage(buffer, 3)

  let predictions: CocoSsdDetection[]
  try {
    predictions = await model.detect(tensor)
  } finally {
    if ('dispose' in tensor && typeof (tensor as { dispose: () => void }).dispose === 'function') {
      ;(tensor as { dispose: () => void }).dispose()
    }
  }

  if (predictions.length === 0) {
    return buffer
  }

  const filtered =
    options.subject !== undefined
      ? predictions.filter((p) => p.class === options.subject)
      : predictions

  const target = (filtered.length > 0 ? filtered : predictions).sort(
    (a, b) => b.score - a.score,
  )[0]

  if (target === undefined) return buffer

  const padding = options.padding ?? 20
  const [x, y, w, h] = target.bbox

  const left = Math.max(0, Math.round(x - padding))
  const top = Math.max(0, Math.round(y - padding))
  const right = Math.min(imgWidth, Math.round(x + w + padding))
  const bottom = Math.min(imgHeight, Math.round(y + h + padding))

  return sharp(buffer)
    .extract({ left, top, width: right - left, height: bottom - top })
    .png()
    .toBuffer()
}

export async function applyUpscale(
  input: Buffer | Uint8Array,
  options: UpscaleOptions,
): Promise<Buffer> {
  const upscaler = await loadUpscaler(options.factor)

  const buffer = input instanceof Buffer ? input : Buffer.from(input)
  const base64Input = `data:image/png;base64,${buffer.toString('base64')}`

  let base64Output: string
  try {
    base64Output = await upscaler.upscale(base64Input)
  } catch (err) {
    throw new ImgCraftError({
      code: 'UPSCALE_FAILED',
      message: `Upscaling failed: ${err instanceof Error ? err.message : String(err)}`,
    })
  }

  const base64Data = base64Output.slice(base64Output.indexOf(',') + 1)
  return Buffer.from(base64Data, 'base64')
}
