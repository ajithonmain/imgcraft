import Link from 'next/link'
import {
  Minimize2,
  Globe,
  Sparkles,
  Link2,
  RefreshCw,
  Layers,
  Sliders,
  Image,
  FileSearch,
  Zap,
} from 'lucide-react'
import { CodeBlock } from '../components/code-block'
import { CopyButton } from '../components/copy-button'

const heroCode = `import { img } from 'imgcraft'

// Smart compression — auto WebP at 80% quality
const small = await img('photo.jpg')
  .compress({ quality: 80 })
  .toBuffer()

// Compress to a specific format
const avif = await img('photo.jpg')
  .compress({ format: 'avif', quality: 60 })
  .toBuffer()

// Resize then compress — chain any transforms
const thumb = await img('photo.jpg')
  .resize(800)
  .compress({ format: 'webp', quality: 85 })
  .toBuffer()`

type LucideIcon = React.ComponentType<{ size?: number; color?: string }>

interface Feature {
  title: string
  desc: string
  icon: LucideIcon
  wide?: boolean
  extra?: React.ReactNode
}

const features: Feature[] = [
  {
    title: 'Compression',
    desc: 'Smart compress to WebP, AVIF, JPEG. Pick quality and format in one call.',
    icon: Minimize2,
  },
  {
    title: 'Node + Browser',
    desc: 'One API, runs everywhere. Sharp for Node, WASM for browser.',
    icon: Globe,
  },
  {
    title: 'AI Built-in',
    desc: 'Background removal, smart crop, upscale. No API key, runs locally.',
    icon: Sparkles,
  },
  {
    title: 'Chainable API',
    desc: 'Compose transforms like sentences. Readable, typed, predictable.',
    icon: Link2,
  },
  {
    title: 'Format Convert',
    desc: 'JPEG, PNG, WebP, AVIF — one method, full per-format options.',
    icon: RefreshCw,
  },
  {
    title: 'Batch Ready',
    desc: 'Process thousands of images with concurrency control.',
    icon: Layers,
  },
  {
    title: 'Color & Filters',
    desc: 'Blur, sharpen, grayscale, tint, brightness, contrast, saturation.',
    icon: Sliders,
  },
  {
    title: 'Compositing',
    desc: 'Overlay images, add watermarks, alpha compositing.',
    icon: Image,
  },
  {
    title: 'Metadata',
    desc: 'Read width, height, format, EXIF. Strip metadata in one call.',
    icon: FileSearch,
  },
  {
    title: 'REST API',
    desc: 'Hosted — POST image, get result. Interactive docs included.',
    icon: Zap,
    wide: true,
    extra: (
      <code style={{ color: 'var(--accent)', fontSize: '12px' }}>
        imgcraft-api.imgcraft.workers.dev/docs
      </code>
    ),
  },
]

export default async function HomePage() {
  return (
    <>
      <section
        style={{
          position: 'relative',
          textAlign: 'center',
          padding: '100px 24px 80px',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '600px',
            height: '400px',
            background:
              'radial-gradient(ellipse at top, rgba(34,197,94,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: '99px',
            padding: '4px 14px',
            fontSize: '12px',
            color: '#22c55e',
            letterSpacing: '0.02em',
            marginBottom: '24px',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              background: '#22c55e',
              borderRadius: '50%',
              display: 'inline-block',
            }}
          />
          v0.1.9 &middot; MIT &middot; 70 tests passing
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(36px, 6vw, 72px)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            margin: '0 0 20px',
          }}
        >
          Image processing
          <br />
          <span style={{ color: '#22c55e' }}>for the modern stack</span>
        </h1>

        {/* Sub */}
        <p
          style={{
            fontSize: '18px',
            color: 'var(--text-muted)',
            maxWidth: '480px',
            margin: '0 auto 36px',
            lineHeight: 1.6,
          }}
        >
          Compress JPEG to WebP in one line. Convert formats, remove backgrounds, upscale
          — chainable API for Node.js and the browser.
        </p>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '56px',
            flexWrap: 'wrap',
          }}
        >
          <Link
            href="/docs/getting-started"
            style={{
              background: '#22c55e',
              color: '#09090b',
              padding: '11px 24px',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Get Started &rarr;
          </Link>
          <Link
            href="/playground"
            style={{
              background: 'transparent',
              color: 'var(--text)',
              padding: '11px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '14px',
              textDecoration: 'none',
              border: '1px solid var(--border)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Try Playground
          </Link>
        </div>

        {/* Stat callout */}
        <div
          style={{
            display: 'inline-flex',
            gap: '32px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '14px 28px',
            marginBottom: '40px',
            fontSize: '13px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <span>
            <strong style={{ color: 'var(--text)' }}>3.5MB</strong>{' '}
            <span style={{ color: 'var(--text-muted)' }}>JPEG</span>
          </span>
          <span style={{ color: 'var(--text-muted)' }}>&rarr;</span>
          <span>
            <strong style={{ color: '#22c55e' }}>60KB</strong>{' '}
            <span style={{ color: 'var(--text-muted)' }}>WebP</span>
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span>
            <strong style={{ color: 'var(--text)' }}>98%</strong>{' '}
            <span style={{ color: 'var(--text-muted)' }}>smaller</span>
          </span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span>
            <strong style={{ color: 'var(--text)' }}>one</strong>{' '}
            <span style={{ color: 'var(--text-muted)' }}>method call</span>
          </span>
        </div>

        {/* Code block */}
        <div className="landing-hero-code">
          <CodeBlock code={heroCode} lang="typescript" filename="example.ts" />
        </div>
      </section>

      <div className="feature-grid">
        {features.map((f) => {
          const Icon = f.icon
          return (
            <div
              key={f.title}
              className="feature-card"
              style={f.wide ? { gridColumn: '1 / -1' } : undefined}
            >
              <div className="feature-icon">
                <Icon size={16} color="#22c55e" />
              </div>
              <div className="feature-card-title">{f.title}</div>
              <div className="feature-card-desc">{f.desc}</div>
              {f.extra && <div style={{ marginTop: '8px' }}>{f.extra}</div>}
            </div>
          )
        })}
      </div>

      <div className="stats-bar">
        <span>70 tests passing</span>
        <span>&middot;</span>
        <span>Node + Browser</span>
        <span>&middot;</span>
        <span>MIT License</span>
        <span>&middot;</span>
        <span>Zero config</span>
        <span>&middot;</span>
        <span>&lt; 100KB core</span>
      </div>

      <div className="install-section">
        <h2>Install</h2>
        <div className="install-snippet">
          <span className="prompt">$</span>
          <span>npm install imgcraft</span>
          <CopyButton text="npm install imgcraft" />
        </div>
        <div className="install-links">
          <a
            href="https://github.com/ajithonmain/imgcraft"
            target="_blank"
            rel="noopener noreferrer"
            className="install-link"
          >
            View on GitHub &rarr;
          </a>
          <Link href="/docs/getting-started" className="install-link">
            Read the docs &rarr;
          </Link>
        </div>
      </div>
    </>
  )
}
