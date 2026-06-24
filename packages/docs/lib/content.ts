import { readFileSync } from 'fs'
import path from 'path'
import matter from 'gray-matter'

const contentDir = path.join(process.cwd(), 'content')

export interface ContentResult {
  source: string
  frontmatter: Record<string, unknown>
}

export function getContent(slug: string[]): ContentResult {
  const filePath = path.join(contentDir, ...slug) + '.mdx'
  const raw = readFileSync(filePath, 'utf-8')
  const { content, data } = matter(raw)
  return { source: content, frontmatter: data as Record<string, unknown> }
}
