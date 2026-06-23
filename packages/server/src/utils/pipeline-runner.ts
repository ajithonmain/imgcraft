import { Pipeline } from 'imgcraft'
import type { PipelineOp } from 'imgcraft'

export interface RunResult {
  buffer: Uint8Array
  format: string
}

export async function runPipeline(input: Uint8Array, ops: PipelineOp[]): Promise<RunResult> {
  const pipeline = new Pipeline(input, ops)
  const data = await pipeline.toBuffer()
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data)

  const formatOp = [...ops]
    .reverse()
    .find((o): o is Extract<PipelineOp, { op: 'format' }> => o.op === 'format')
  const format = formatOp?.options.format ?? 'jpeg'

  return { buffer: bytes, format }
}
