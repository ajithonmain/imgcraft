import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { TopNav } from '../components/top-nav'
import './globals.css'

export const metadata: Metadata = {
  title: 'imgcraft — Image processing for the modern stack',
  description:
    'Chainable image transforms, AI ops, Node + Browser WASM. The sharp alternative built for 2025.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '16x16 32x32', type: 'image/x-icon' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'imgcraft — Image processing for the modern stack',
    description: 'Chainable transforms, AI ops, Node + Browser WASM.',
    url: 'https://imgcraft-docs.vercel.app',
    siteName: 'imgcraft',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'imgcraft',
    description: 'Chainable transforms, AI ops, Node + Browser WASM.',
  },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning style={
      {
        '--font-sans': GeistSans.style.fontFamily,
        '--font-mono': GeistMono.style.fontFamily,
      } as React.CSSProperties
    }>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme')||(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}`,
          }}
        />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <TopNav />
        {children}
      </body>
    </html>
  )
}
