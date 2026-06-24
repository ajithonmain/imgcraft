import Link from 'next/link'
import Image from 'next/image'
import { Github } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'

export function TopNav() {
  return (
    <nav className="top-nav">
      <Link href="/" className="top-nav-logo">
        <Image src="/logo.png" height={28} width={28} alt="imgcraft" />
        <span>imgcraft</span>
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
