export interface NavItem {
  title: string
  href: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    items: [{ title: 'Introduction', href: '/docs/getting-started' }],
  },
  {
    title: 'Core API',
    items: [
      { title: 'Resize', href: '/docs/api/resize' },
      { title: 'Format', href: '/docs/api/format' },
      { title: 'Filters', href: '/docs/api/filters' },
      { title: 'Composite', href: '/docs/api/composite' },
      { title: 'Metadata', href: '/docs/api/metadata' },
    ],
  },
  {
    title: 'AI Operations',
    items: [{ title: 'AI Operations', href: '/docs/api/ai' }],
  },
  {
    title: 'Batch',
    items: [{ title: 'Batch Processing', href: '/docs/api/batch' }],
  },
  {
    title: 'REST API',
    items: [{ title: 'REST API Reference', href: '/docs/rest-api' }],
  },
]

export const allNavItems: NavItem[] = navigation.flatMap((s) => s.items)

export function getAdjacentPages(href: string): {
  prev: NavItem | null
  next: NavItem | null
} {
  const idx = allNavItems.findIndex((item) => item.href === href)
  return {
    prev: idx > 0 ? (allNavItems[idx - 1] ?? null) : null,
    next: idx < allNavItems.length - 1 ? (allNavItems[idx + 1] ?? null) : null,
  }
}
