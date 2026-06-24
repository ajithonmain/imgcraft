import { codeToHtml } from 'shiki'
import { CopyButton } from './copy-button'

interface CodeBlockProps {
  code: string
  lang?: string
  filename?: string
}

async function highlight(code: string, lang: string, theme: string): Promise<string> {
  try {
    return await codeToHtml(code, { lang, theme })
  } catch {
    return `<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`
  }
}

export async function CodeBlock({ code, lang = 'typescript', filename }: CodeBlockProps) {
  const [darkHtml, lightHtml] = await Promise.all([
    highlight(code, lang, 'github-dark'),
    highlight(code, lang, 'github-light'),
  ])

  return (
    <div className="code-block-wrap">
      <div
        className="code-block-header"
        style={filename == null ? { justifyContent: 'flex-end' } : undefined}
      >
        {filename != null && <span>{filename}</span>}
        <CopyButton text={code} />
      </div>
      <div className="code-dark" dangerouslySetInnerHTML={{ __html: darkHtml }} />
      <div className="code-light" dangerouslySetInnerHTML={{ __html: lightHtml }} />
    </div>
  )
}
