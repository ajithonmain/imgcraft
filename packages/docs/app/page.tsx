import Link from 'next/link'
import { CodeBlock } from '../components/code-block'
import { CopyButton } from '../components/copy-button'

const heroCode = `import { img } from 'imgcraft'

const buffer = await img('photo.jpg')
  .resize(800)
  .removeBackground()
  .webp({ quality: 85 })
  .toBuffer()`

const features = [
  {
    title: 'Node + Browser',
    desc: 'One API, runs everywhere. Sharp for Node, WASM for browser.',
  },
  {
    title: 'AI Built-in',
    desc: 'Background removal, smart crop, upscale. No API key, runs locally.',
  },
  {
    title: 'Chainable API',
    desc: 'Compose transforms like sentences. Readable, typed, predictable.',
  },
  {
    title: 'Format Convert',
    desc: 'JPEG, PNG, WebP, AVIF — one method, full per-format options.',
  },
  {
    title: 'Batch Ready',
    desc: 'Process thousands of images with concurrency control.',
  },
  {
    title: 'Color & Filters',
    desc: 'Blur, sharpen, grayscale, tint, brightness, contrast, saturation.',
  },
  {
    title: 'Compositing',
    desc: 'Overlay images, add watermarks, alpha compositing.',
  },
  {
    title: 'Metadata',
    desc: 'Read width, height, format, EXIF. Strip metadata in one call.',
  },
  {
    title: 'REST API',
    desc: 'Hosted at imgcraft-api.imgcraft.workers.dev. POST an image, get transforms.',
  },
]

export default async function HomePage() {
  return (
    <>
      <section className="landing-hero">
        <h1 className="landing-headline">
          Image processing
          <br />
          for the modern stack
        </h1>
        <p className="landing-subline">
          Chainable transforms, AI ops, Node + Browser. The sharp alternative built for 2025.
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
          <CodeBlock code={heroCode} lang="typescript" darkOnly />
        </div>
      </section>

      <div className="feature-grid">
        {features.map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-card-title">{f.title}</div>
            <div className="feature-card-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      <div className="stats-bar">
        <span>65 tests passing</span>
        <span className="stats-bar-divider" />
        <span>Node + Browser</span>
        <span className="stats-bar-divider" />
        <span>MIT License</span>
        <span className="stats-bar-divider" />
        <span>Zero config</span>
      </div>

      <div className="install-section">
        <h2>Install</h2>
        <div className="install-snippet">
          <span className="prompt">$</span>
          <span>npm install imgcraft</span>
          <CopyButton text="npm install imgcraft" />
        </div>
      </div>
    </>
  )
}
