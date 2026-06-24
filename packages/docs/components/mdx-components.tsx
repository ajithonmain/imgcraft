import type { ReactNode, HTMLAttributes, ComponentType } from 'react'
import React from 'react'
import { codeToHtml } from 'shiki'
import { CopyButton } from './copy-button'
import { Callout } from './callout'
import { ApiTable } from './api-table'
import { Badge } from './badge'

type AnyProps = { children?: ReactNode; [key: string]: unknown }

async function MdxPre({ children }: HTMLAttributes<HTMLPreElement>) {
  const child = children as React.ReactElement<{
    className?: string
    children?: string
  }>

  const className =
    child != null && typeof child === 'object' && 'props' in child
      ? (child.props.className ?? '')
      : ''
  const lang = className.replace('language-', '') || 'text'
  const code =
    child != null && typeof child === 'object' && 'props' in child
      ? String(child.props.children ?? '').trim()
      : ''

  const [darkHtml, lightHtml] = await Promise.all([
    codeToHtml(code, { lang, theme: 'github-dark' }),
    codeToHtml(code, { lang, theme: 'github-light' }),
  ])

  return (
    <div className="code-block-wrap">
      <div className="code-block-header" style={{ justifyContent: 'flex-end' }}>
        <CopyButton text={code} />
      </div>
      <div className="code-dark" dangerouslySetInnerHTML={{ __html: darkHtml }} />
      <div className="code-light" dangerouslySetInnerHTML={{ __html: lightHtml }} />
    </div>
  )
}

function MdxCode({ children, className }: { children?: ReactNode; className?: string }) {
  if (className?.startsWith('language-')) {
    return <code className={className}>{children}</code>
  }
  return <code>{children}</code>
}

const cast = <P,>(c: ComponentType<P>): ComponentType<AnyProps> =>
  c as unknown as ComponentType<AnyProps>

export const mdxComponents: Record<string, ComponentType<AnyProps>> = {
  pre: cast(MdxPre as ComponentType<HTMLAttributes<HTMLPreElement>>),
  code: cast(MdxCode),
  Callout: cast(Callout),
  ApiTable: cast(ApiTable),
  Badge: cast(Badge),
}
