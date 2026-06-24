<p align="center">
  <img src="https://imgcraft-docs.vercel.app/logo.png" height="96" alt="imgcraft" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/imgcraft"><img src="https://img.shields.io/npm/v/imgcraft.svg" alt="npm version" /></a>
  <a href="https://github.com/ajithonmain/imgcraft/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/imgcraft.svg" alt="license" /></a>
  <a href="https://github.com/ajithonmain/imgcraft/actions"><img src="https://img.shields.io/badge/tests-65%20passing-brightgreen.svg" alt="tests" /></a>
  <a href="https://www.npmjs.com/package/imgcraft"><img src="https://img.shields.io/npm/dm/imgcraft" alt="npm downloads" /></a>
</p>

<p align="center"><b>Chainable image transforms for Node.js and the browser — with AI ops built in.</b></p>

## Install

```sh
npm install imgcraft
```

Node.js requires [sharp](https://sharp.pixelplumbing.com/) as an optional peer dep. Browser uses WASM — no extra install.

## Usage

```ts
import { img, batch } from 'imgcraft'

// Resize + remove background + convert — in one chain
const buffer = await img('photo.jpg')
  .resize(800)
  .removeBackground()
  .webp({ quality: 85 })
  .toBuffer()

// Batch process with concurrency control
await batch(['a.jpg', 'b.jpg', 'c.jpg'], { concurrency: 4 })
  .resize(1200)
  .webp()
  .toDir('./output')
```

## Why imgcraft?

| Feature | imgcraft | sharp |
|---|---|---|
| Chainable API | ✅ | ✅ |
| Node.js | ✅ | ✅ |
| Browser (WASM) | ✅ | ❌ |
| AI background removal | ✅ | ❌ |
| Smart crop | ✅ | ❌ |
| AI upscaling | ✅ | ❌ |
| Hosted REST API | ✅ | ❌ |
| TypeScript strict | ✅ | ✅ |

## API

```ts
img(input)
  .resize(width?, height?, options?)
  .crop(left, top, width, height)
  .rotate(angle)
  .flip() / .flop()
  .format('webp' | 'jpeg' | 'png' | 'avif')
  .quality(1-100)
  .blur(sigma?) / .sharpen() / .grayscale()
  .brightness(factor) / .contrast(factor) / .saturation(factor)
  .tint(color) / .negate()
  .composite(input, options?)
  .removeBackground()        // AI — no API key needed
  .smartCrop(options?)       // AI — subject-aware crop
  .upscale(2 | 4)            // AI — ESRGAN upscaling
  .meta()                    // read metadata
  .stripMeta()               // strip EXIF
  .toBuffer()                // → Buffer (Node) / Uint8Array (browser)
  .toFile(path)              // → write to disk (Node)
  .toStream()                // → ReadableStream
  .toDataURL()               // → base64 data URI (browser)
```

## REST API

```
POST https://imgcraft-api.imgcraft.workers.dev/transform
POST https://imgcraft-api.imgcraft.workers.dev/info
GET  https://imgcraft-api.imgcraft.workers.dev/health
```

## Links

**[Docs](https://imgcraft-docs.vercel.app)** · **[Playground](https://imgcraft-docs.vercel.app/playground)** · **[GitHub](https://github.com/ajithonmain/imgcraft)**

## License

MIT © 2026 Ajith M Jose
