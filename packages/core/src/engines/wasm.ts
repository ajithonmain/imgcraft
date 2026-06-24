import { ImgCraftError } from '../types.js'
import type { PipelineState, MetadataResult, EngineResult, ImageInput, PipelineOp } from '../types.js'

// @cf-wasm/photon types (node entry matches workerd entry structurally)
type PhotonModule = typeof import('@cf-wasm/photon/node')
type PhotonImageInstance = InstanceType<PhotonModule['PhotonImage']>

let photonCache: PhotonModule | null = null

async function importPhoton(): Promise<PhotonModule> {
  if (photonCache !== null) return photonCache
  try {
    // Dynamic import respects the exports map — node condition in Node.js,
    // workerd/default in Cloudflare Workers, browser bundler picks its own entry.
    const mod = (await import('@cf-wasm/photon/node')) as PhotonModule
    photonCache = mod
    return mod
  } catch {
    throw new ImgCraftError({
      code: 'WASM_NOT_AVAILABLE',
      message:
        '@cf-wasm/photon is required for browser/WASM image processing. Install it: npm install @cf-wasm/photon',
    })
  }
}

async function toUint8Array(input: ImageInput): Promise<Uint8Array> {
  if (typeof input === 'string') {
    if (typeof fetch !== 'undefined') {
      const res = await fetch(input)
      return new Uint8Array(await res.arrayBuffer())
    }
    throw new ImgCraftError({
      code: 'UNSUPPORTED_INPUT',
      message: 'File path inputs are not supported in the browser WASM engine. Use a URL or Blob.',
    })
  }
  if (input instanceof Uint8Array) return input
  if (input instanceof Buffer) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
  if (input instanceof ArrayBuffer) return new Uint8Array(input)
  if (input instanceof URL) {
    const res = await fetch(input)
    return new Uint8Array(await res.arrayBuffer())
  }
  throw new ImgCraftError({
    code: 'INVALID_INPUT',
    message: 'Unsupported input type for WASM engine.',
  })
}

function warnUnsupported(opName: string): void {
  console.warn(`[imgcraft/wasm] "${opName}" is not supported in the WASM engine. Skipping.`)
}

function outputFormat(ops: readonly PipelineOp[]): { format: string; quality?: number } {
  let format = 'jpeg'
  let quality: number | undefined

  for (const op of ops) {
    if (op.op === 'format') {
      format = op.options.format
      quality = op.options.quality
    } else if (op.op === 'quality') {
      quality = op.value
    } else if (op.op === 'compress') {
      format = op.options?.format ?? 'webp'
      if (op.options?.quality !== undefined) quality = op.options.quality
    }
  }

  return { format, quality }
}

function encodePhoton(
  photon: PhotonModule,
  img: PhotonImageInstance,
  format: string,
  quality?: number,
): { data: Uint8Array; format: string } {
  switch (format) {
    case 'jpeg':
      return { data: img.get_bytes_jpeg(quality ?? 85), format: 'jpeg' }
    case 'webp':
      return { data: img.get_bytes_webp(), format: 'webp' }
    case 'png':
      return { data: img.get_bytes(), format: 'png' }
    case 'avif':
      console.warn('[imgcraft/wasm] avif is not supported in the WASM engine. Using WebP instead.')
      return { data: img.get_bytes_webp(), format: 'webp' }
    case 'tiff':
      console.warn('[imgcraft/wasm] tiff is not supported in the WASM engine. Using PNG instead.')
      return { data: img.get_bytes(), format: 'png' }
    default:
      console.warn(`[imgcraft/wasm] Unknown format "${format}". Using PNG.`)
      return { data: img.get_bytes(), format: 'png' }
  }
}

export async function processWasm(state: PipelineState): Promise<EngineResult> {
  const photon = await importPhoton()
  const bytes = await toUint8Array(state.input)
  let img = photon.PhotonImage.new_from_byteslice(bytes)

  const { format, quality } = outputFormat(state.ops)

  try {
    for (const op of state.ops) {
      switch (op.op) {
        case 'resize': {
          const srcW = img.get_width()
          const srcH = img.get_height()
          let { width, height } = op.options
          // Preserve aspect ratio if only one dimension given
          if (width !== undefined && height === undefined) {
            height = Math.round((srcH / srcW) * width)
          } else if (height !== undefined && width === undefined) {
            width = Math.round((srcW / srcH) * height)
          }
          if (width === undefined || height === undefined) break
          const resized = photon.resize(img, width, height, photon.SamplingFilter.Lanczos3)
          img.free()
          img = resized
          break
        }

        case 'crop': {
          const { left, top, width, height } = op.options
          const cropped = photon.crop(img, left, top, left + width, top + height)
          img.free()
          img = cropped
          break
        }

        case 'rotate': {
          const { angle } = op.options
          const norm = ((angle % 360) + 360) % 360
          if (norm === 0) break
          if (norm === 90 || norm === 180 || norm === 270) {
            photon.rotate(img, norm)
          } else {
            warnUnsupported(`rotate(${angle}) — only 90°/180°/270° supported in WASM engine`)
          }
          break
        }

        case 'flip':
          photon.flipv(img)
          break

        case 'flop':
          photon.fliph(img)
          break

        case 'grayscale':
          photon.grayscale_human_corrected(img)
          break

        case 'negate':
          photon.invert(img)
          break

        case 'brightness':
          if (op.options.brightness !== undefined) {
            photon.adjust_brightness(img, Math.round((op.options.brightness - 1) * 128))
          }
          break

        case 'contrast':
          photon.adjust_contrast(img, (op.options.value - 1) * 128)
          break

        case 'tint':
          photon.tint(img, op.options.r, op.options.g, op.options.b)
          break

        case 'blur':
        case 'sharpen':
        case 'median':
        case 'saturation':
        case 'composite':
        case 'stripMeta':
        case 'removeBackground':
        case 'smartCrop':
        case 'upscale':
          warnUnsupported(op.op)
          break

        case 'format':
        case 'quality':
        case 'compress':
          // Collected above in outputFormat()
          break
      }
    }

    const { data, format: outFmt } = encodePhoton(photon, img, format, quality)

    return {
      data,
      format: outFmt,
      width: img.get_width(),
      height: img.get_height(),
    }
  } finally {
    img.free()
  }
}

export async function metadataWasm(input: ImageInput): Promise<MetadataResult> {
  const photon = await importPhoton()
  const bytes = await toUint8Array(input)

  const img = photon.PhotonImage.new_from_byteslice(bytes)
  try {
    return {
      width: img.get_width(),
      height: img.get_height(),
    }
  } finally {
    img.free()
  }
}

export const wasmEngine = {
  process: processWasm,
  metadata: metadataWasm,
}
