import { codeToHtml } from 'shiki'
import { CopyButton } from './copy-button'

interface CodeBlockProps {
  code: string
  lang?: string
  filename?: string
}

export async function CodeBlock({ code, lang = 'typescript', filename }: CodeBlockProps) {
  const [darkHtml, lightHtml] = await Promise.all([
    codeToHtml(code, { lang, theme: 'github-dark' }),
    codeToHtml(code, { lang, theme: 'github-light' }),
  ])

  return (
    <div className="code-block-wrap">
      {filename != null && (
        <div className="code-block-header">
          <span>{filename}</span>
          <CopyButton text={code} />
        </div>
      )}
      {filename == null && (
        <div className="code-block-header" style={{ justifyContent: 'flex-end' }}>
          <CopyButton text={code} />
        </div>
      )}
      <div
        className="code-dark"
        dangerouslySetInnerHTML={{ __html: darkHtml }}
      />
      <div
        className="code-light"
        dangerouslySetInnerHTML={{ __html: lightHtml }}
      />
    </div>
  )
}
