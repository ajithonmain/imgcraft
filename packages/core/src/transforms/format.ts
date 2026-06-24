import type { Sharp } from 'sharp'
import type { CompressOptions } from '../types.js'

export function applyCompress(pipeline: Sharp, options: CompressOptions): Sharp {
  const format = options.format ?? 'webp'
  const quality = options.quality ?? 80
  const effort = options.effort

  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({ quality })
    case 'png':
      return pipeline.png({ quality })
    case 'webp':
      return pipeline.webp(effort !== undefined ? { quality, effort } : { quality })
    case 'avif':
      return pipeline.avif(effort !== undefined ? { quality, effort } : { quality })
    default:
      return pipeline.webp({ quality })
  }
}
