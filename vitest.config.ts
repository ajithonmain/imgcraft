import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    root,
    globals: false,
    environment: 'node',
    include: ['packages/core/src/**/*.test.ts', 'packages/core/src/**/*.browser.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/core/src/**/*.ts'],
      exclude: ['packages/core/src/**/*.test.ts'],
    },
  },
})
