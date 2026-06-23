import { z } from 'zod'
import type { PipelineOp } from 'imgcraft'

const rgbaColorSchema = z.object({
  r: z.number().int().min(0).max(255),
  g: z.number().int().min(0).max(255),
  b: z.number().int().min(0).max(255),
  alpha: z.number().min(0).max(1).optional(),
})

const colorSchema = z.union([z.string(), rgbaColorSchema])

const fitModeSchema = z.enum(['cover', 'contain', 'fill', 'inside', 'outside'])
const outputFormatSchema = z.enum(['jpeg', 'png', 'webp', 'avif', 'tiff'])
const blendModeSchema = z.enum([
  'over', 'multiply', 'screen', 'darken', 'lighten', 'overlay', 'add', 'dest-out',
])
const gravitySchema = z.enum([
  'center', 'north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest',
])

const opSchemas = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('resize'),
    options: z.object({
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
      fit: fitModeSchema.optional(),
      background: colorSchema.optional(),
      withoutEnlargement: z.boolean().optional(),
    }),
  }),
  z.object({
    op: z.literal('crop'),
    options: z.object({
      left: z.number().int().min(0),
      top: z.number().int().min(0),
      width: z.number().int().positive(),
      height: z.number().int().positive(),
    }),
  }),
  z.object({
    op: z.literal('rotate'),
    options: z.object({
      angle: z.number(),
      background: colorSchema.optional(),
    }),
  }),
  z.object({ op: z.literal('flip') }),
  z.object({ op: z.literal('flop') }),
  z.object({
    op: z.literal('format'),
    options: z.object({
      format: outputFormatSchema,
      quality: z.number().int().min(1).max(100).optional(),
    }),
  }),
  z.object({
    op: z.literal('quality'),
    value: z.number().int().min(1).max(100),
  }),
  z.object({
    op: z.literal('blur'),
    options: z.object({ sigma: z.number().positive().optional() }),
  }),
  z.object({
    op: z.literal('sharpen'),
    options: z.object({
      sigma: z.number().positive().optional(),
      m1: z.number().optional(),
      m2: z.number().optional(),
    }),
  }),
  z.object({
    op: z.literal('median'),
    options: z.object({ size: z.number().int().positive().optional() }),
  }),
  z.object({ op: z.literal('grayscale') }),
  z.object({
    op: z.literal('tint'),
    options: z.object({
      r: z.number().int().min(0).max(255),
      g: z.number().int().min(0).max(255),
      b: z.number().int().min(0).max(255),
    }),
  }),
  z.object({ op: z.literal('negate') }),
  z.object({
    op: z.literal('brightness'),
    options: z.object({ brightness: z.number().positive() }),
  }),
  z.object({
    op: z.literal('saturation'),
    options: z.object({ saturation: z.number().min(0) }),
  }),
  z.object({
    op: z.literal('contrast'),
    options: z.object({ value: z.number() }),
  }),
  z.object({
    op: z.literal('composite'),
    options: z.object({
      input: z.string(),
      blend: blendModeSchema.optional(),
      top: z.number().int().optional(),
      left: z.number().int().optional(),
      gravity: gravitySchema.optional(),
    }),
  }),
  z.object({ op: z.literal('stripMeta') }),
  z.object({ op: z.literal('removeBackground') }),
  z.object({
    op: z.literal('smartCrop'),
    options: z.object({
      padding: z.number().min(0).optional(),
      subject: z.string().optional(),
    }),
  }),
  z.object({
    op: z.literal('upscale'),
    options: z.object({ factor: z.union([z.literal(2), z.literal(4)]) }),
  }),
])

export const opsArraySchema = z.array(opSchemas).min(1)

export function validateOps(raw: unknown): PipelineOp[] {
  const result = opsArraySchema.safeParse(raw)
  if (!result.success) {
    throw result.error
  }
  return result.data as PipelineOp[]
}
