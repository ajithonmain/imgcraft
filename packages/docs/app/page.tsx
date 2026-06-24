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
      <section className="landing-hero">
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(34,197,94,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ position: 'relative' }}>
          <div style={{ marginBottom: '1.25rem' }}>
            <span
              style={{
                border: '1px solid #22c55e33',
                color: '#22c55e',
                padding: '2px 10px',
                borderRadius: '99px',
                fontSize: '12px',
              }}
            >
              v0.1.9 &middot; MIT &middot; 70 tests passing
            </span>
          </div>
          <h1 className="landing-headline">
            Image processing
            <br />
            for the modern stack
          </h1>
          <p className="landing-subline">
            Compress, convert, resize. AI ops. Node + Browser. Zero config.
          </p>
          <div className="landing-ctas">
            <Link href="/docs/getting-started" className="btn-primary">
              Get Started &rarr;
            </Link>
            <Link href="/playground" className="btn-secondary">
              Try Playground
            </Link>
          </div>
          <div className="landing-hero-code">
            <div className="hero-code-block">
              <div
                style={{
                  borderBottom: '1px solid var(--border)',
                  padding: '8px 16px',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  fontFamily: 'monospace',
                }}
              >
                example.ts
              </div>
              <CodeBlock code={heroCode} lang="typescript" darkOnly />
            </div>
          </div>
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
              {f.extra && (
                <div style={{ marginTop: '8px' }}>{f.extra}</div>
              )}
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
