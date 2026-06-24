'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Github } from 'lucide-react'
import { ThemeToggle } from './theme-toggle'
import { useState } from 'react'

const NAV_LINKS = [
  { href: '/docs/getting-started', label: 'Docs' },
  { href: '/docs/rest-api', label: 'API' },
  { href: '/playground', label: 'Playground' },
]

export function TopNav() {
  const pathname = usePathname()
  const [imgError, setImgError] = useState(false)

  return (
    <nav className="top-nav">
      <Link href="/" className="top-nav-logo">
        {imgError ? (
          <div className="top-nav-logo-fallback">ic</div>
        ) : (
          <img
            src="/logo.png"
            height={28}
            width={28}
            alt=""
            onError={() => setImgError(true)}
          />
        )}
        <span>
          img<span style={{ color: 'var(--accent)' }}>craft</span>
        </span>
      </Link>
      <div className="top-nav-links">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`top-nav-link${active ? ' nav-link-active' : ''}`}
              style={
                active
                  ? {
                      background: 'rgba(34,197,94,0.12)',
                      color: '#22c55e',
                      fontWeight: 600,
                    }
                  : undefined
              }
            >
              {label}
            </Link>
          )
        })}
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
