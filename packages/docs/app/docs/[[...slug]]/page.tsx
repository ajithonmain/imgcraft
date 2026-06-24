import { redirect, notFound } from 'next/navigation'
import { MDXRemote } from 'next-mdx-remote/rsc'
import Link from 'next/link'
import { getContent } from '../../../lib/content'
import { allNavItems, getAdjacentPages } from '../../../lib/nav'
import { mdxComponents } from '../../../components/mdx-components'

interface Props {
  params: Promise<{ slug?: string[] }>
}

export async function generateStaticParams() {
  return allNavItems.map((item) => ({
    slug: item.href.replace('/docs/', '').split('/'),
  }))
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
    notFound()
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
