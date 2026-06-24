<p align="center">
  <img src="https://imgcraft-docs.vercel.app/logo.png" height="80" alt="imgcraft" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/imgcraft"><img src="https://img.shields.io/npm/v/imgcraft.svg" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/imgcraft"><img src="https://img.shields.io/npm/dm/imgcraft.svg" alt="downloads"></a>
  <a href="https://github.com/ajithonmain/imgcraft/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/imgcraft.svg" alt="license"></a>
  <a href="https://github.com/ajithonmain/imgcraft/actions"><img src="https://img.shields.io/badge/tests-65%20passing-brightgreen.svg" alt="tests"></a>
</p>

---

Chainable image processing for Node.js and the browser — with AI ops built in.

imgcraft converts images between formats, resizes, crops, removes backgrounds, upscales, and more — via a fluent chainable API. It runs natively in Node.js using sharp, and in the browser via WebAssembly. A hosted REST API is also available at `https://imgcraft-api.imgcraft.workers.dev`.

## Installation

```sh
npm install imgcraft
```

## Examples

```ts
import { img, batch } from 'imgcraft'

// Resize and convert
const buffer = await img('photo.jpg')
  .resize(800, 600)
  .webp({ quality: 85 })
  .toBuffer()

// Remove background (no API key needed — runs locally)
const buffer = await img('portrait.jpg')
  .removeBackground()
  .png()
  .toBuffer()

// Chain multiple transforms
const buffer = await img('input.png')
  .resize(1200)
  .sharpen()
  .removeBackground()
  .upscale(2)
  .webp({ quality: 90 })
  .toBuffer()

// Batch process with concurrency control
await batch(['a.jpg', 'b.jpg', 'c.jpg'], { concurrency: 4 })
  .resize(800)
  .webp()
  .toDir('./output')

// Browser (WASM — same API)
const result = await img(file)
  .resize(400)
  .grayscale()
  .toDataURL()

// Read metadata
const meta = await img('photo.jpg').meta()
// { width: 3024, height: 4032, format: 'jpeg', size: 3621944, hasAlpha: false }

// REST API
const form = new FormData()
form.append('image', file)
form.append('ops', JSON.stringify([
  { op: 'resize', width: 800 },
  { op: 'format', format: 'webp', quality: 85 }
]))
const res = await fetch('https://imgcraft-api.imgcraft.workers.dev/transform', {
  method: 'POST', body: form
})
const blob = await res.blob()
```

## Supported operations

**Transforms**
- `resize(width?, height?, options?)` — fit modes: cover, contain, fill, inside, outside
- `crop(left, top, width, height)` — extract a region
- `rotate(angle)` — 0, 90, 180, 270 degrees
- `flip()` — vertical flip
- `flop()` — horizontal flip

**Colour**
- `grayscale()` — convert to greyscale
- `tint(colour)` — apply colour tint
- `negate()` — invert colours
- `brightness(factor)` — adjust brightness
- `contrast(factor)` — adjust contrast
- `saturation(factor)` — adjust saturation

**Filters**
- `blur(sigma?)` — Gaussian blur
- `sharpen(options?)` — unsharp mask
- `median(size?)` — median filter

**Format & output**
- `format(type)` — jpeg, png, webp, avif
- `quality(1–100)` — output quality
- `jpeg(options?)` — JPEG-specific options
- `png(options?)` — PNG-specific options
- `webp(options?)` — WebP-specific options
- `avif(options?)` — AVIF-specific options

**Compositing**
- `composite(input, options?)` — overlay/watermark (base64 data URI input)

**Metadata**
- `meta()` — read width, height, format, size, hasAlpha, channels
- `stripMeta()` — remove EXIF and ICC data

**AI operations** *(Node.js only — lazy loaded, no API key required)*
- `removeBackground()` — subject isolation via ONNX model
- `smartCrop(options?)` — subject-aware crop via TensorFlow coco-ssd
- `upscale(2 | 4)` — ESRGAN super-resolution upscaling

**Output**
- `toBuffer()` — `Buffer` (Node.js) / `Uint8Array` (browser)
- `toFile(path)` — write to disk (Node.js only)
- `toStream()` — `ReadableStream<Uint8Array>`
- `toDataURL()` — base64 data URI (browser)

**Batch**
- `batch(inputs[], options?)` — process multiple images
- `.toBuffers()` — array of results
- `.toDir(path)` — write all to directory
- `.toFiles(paths[])` — 1:1 path mapping

## REST API

```
POST  https://imgcraft-api.imgcraft.workers.dev/transform   # process image
POST  https://imgcraft-api.imgcraft.workers.dev/info        # read metadata
GET   https://imgcraft-api.imgcraft.workers.dev/health      # status
```

Rate limited to 60 requests per minute per IP. AI operations not available via REST API.

## Documentation

Visit **[imgcraft-docs.vercel.app](https://imgcraft-docs.vercel.app)** for complete API documentation, guides, and a live playground.

## Contributing

Issues and pull requests welcome at [github.com/ajithonmain/imgcraft](https://github.com/ajithonmain/imgcraft).

## License

MIT © 2026 Ajith M Jose
