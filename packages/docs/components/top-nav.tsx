import Link from 'next/link'
import { Github } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function TopNav() {
  return (
    <nav className="top-nav">
      <Link href="/" className="top-nav-logo">
        <span className="top-nav-logo-dot" />
        imgcraft
      </Link>
      <div className="top-nav-links">
        <Link href="/docs/getting-started" className="top-nav-link">
          Docs
        </Link>
        <Link href="/docs/rest-api" className="top-nav-link">
          API
        </Link>
        <Link href="/playground" className="top-nav-link">
          Playground
        </Link>
      </div>
      <div className="top-nav-right">
        <a
          href="https://github.com/ajithonmain/imgcraft"
          target="_blank"
          rel="noopener noreferrer"
          className="github-btn"
        >
          <Github size={14} />
          Star
        </a>
        <ThemeToggle />
      </div>
    </nav>
  )
}
