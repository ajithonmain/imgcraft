import createMDX from '@next/mdx'
import type { NextConfig } from 'next'

const withMDX = createMDX({})

const config: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  outputFileTracingIncludes: {
    '/docs/(.*)': ['./content/**/*'],
  },
}

export default withMDX(config)
