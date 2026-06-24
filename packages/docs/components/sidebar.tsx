'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { navigation } from '../lib/nav'

export function Sidebar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <div
        className={`sidebar-overlay ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      />

      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 1rem 0.5rem' }}>
          <button
            className="theme-toggle"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            style={{ display: open ? 'flex' : 'none' }}
          >
            <X size={16} />
          </button>
        </div>
        {navigation.map((section) => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                {item.title}
              </Link>
            ))}
          </div>
        ))}
      </aside>
    </>
  )
}
