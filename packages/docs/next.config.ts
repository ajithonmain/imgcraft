import type { NextConfig } from 'next'

const config: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'mdx'],
  experimental: {
    mdxRs: true,
  },
}

export default config
