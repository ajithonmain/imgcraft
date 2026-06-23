import type { PipelineState, MetadataResult, EngineResult, ImageInput } from '../types.js'

export interface Engine {
  process(state: PipelineState): Promise<EngineResult>
  metadata(input: ImageInput): Promise<MetadataResult>
}

function detectNode(): boolean {
  // Cloudflare Workers expose a `process` global but no `process.versions.node`
  return (
    typeof process !== 'undefined' &&
    typeof process.versions !== 'undefined' &&
    typeof process.versions.node === 'string'
  )
}

export async function getEngine(): Promise<Engine> {
  if (detectNode()) {
    const { nodeEngine } = await import('../engines/node.js')
    return nodeEngine
  }
  // Browser and Cloudflare Workers both use the WASM engine
  const { wasmEngine } = await import('../engines/wasm.js')
  return wasmEngine
}
