import type { ReactNode } from 'react'
import { Sidebar } from '../../components/sidebar'

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="docs-layout">
      <Sidebar />
      <main className="docs-main">{children}</main>
    </div>
  )
}
