export interface Env {
  RATE_LIMIT_RPM: string
  ALLOWED_ORIGINS: string
  RATE_LIMIT_KV: KVNamespace
}

export default {
  async fetch(_request: Request, _env: Env): Promise<Response> {
    return new Response('imgcraft API — scaffold only', { status: 200 })
  },
} satisfies ExportedHandler<Env>
