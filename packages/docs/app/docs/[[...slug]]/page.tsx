import { redirect } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { getContent } from '../../../lib/content'
import { getAdjacentPages } from '../../../lib/nav'
import { mdxComponents } from '../../../components/mdx-components'

interface Props {
  params: Promise<{ slug?: string[] }>
}

export default async function DocsPage({ params }: Props) {
  const { slug } = await params

  if (slug == null || slug.length === 0) {
    redirect('/docs/getting-started')
  }

  let source: string
  try {
    const result = getContent(slug)
    source = result.source
  } catch {
    return (
      <article className="docs-content">
        <h1>Not found</h1>
        <p>This page does not exist yet.</p>
      </article>
    )
  }

  const href = `/docs/${slug.join('/')}`
  const { prev, next } = getAdjacentPages(href)

  return (
    <article className="docs-content">
      <MDXRemote source={source} components={mdxComponents} />
      <nav className="docs-nav">
        {prev != null ? (
          <Link href={prev.href} className="docs-nav-link">
            <span className="docs-nav-label">&larr; Previous</span>
            <span className="docs-nav-title">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next != null && (
          <Link href={next.href} className="docs-nav-link next">
            <span className="docs-nav-label">Next &rarr;</span>
            <span className="docs-nav-title">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  )
}
