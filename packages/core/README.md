# imgcraft

<p align="center">
  <img src="https://imgcraft-docs.vercel.app/logo.png" height="80" alt="imgcraft" />
</p>

Chainable image transforms for Node + Browser.

[![npm version](https://img.shields.io/npm/v/imgcraft.svg)](https://www.npmjs.com/package/imgcraft)
[![license](https://img.shields.io/npm/l/imgcraft.svg)](https://github.com/ajithonmain/imgcraft/blob/main/LICENSE)
[![tests](https://img.shields.io/badge/tests-65%20passing-brightgreen.svg)](https://github.com/ajithonmain/imgcraft/actions)

## Install

```sh
npm install imgcraft
```

Node.js uses [sharp](https://sharp.pixelplumbing.com/) under the hood (optional peer dep). Browser uses WASM — no extra install.

## Usage

```ts
import { img, batch } from 'imgcraft'

// Node
const buf = await img('photo.jpg')
  .resize(800, 600)
  .webp({ quality: 85 })
  .toBuffer()

// Browser (same API, WASM engine auto-selected)
const url = await img(file)
  .resize(400)
  .removeBackground()
  .toDataURL()

// Batch
await batch(['a.jpg', 'b.jpg', 'c.jpg'])
  .resize(1200)
  .webp()
  .toDir('./output')
```

## Features

| Feature | Status |
|---|---|
| Node.js (sharp engine) | ✅ |
| Browser (WASM engine) | ✅ |
| AI ops (bg removal, smart crop, upscale) | ✅ |
| TypeScript strict | ✅ |
| Zero config | ✅ |
| Tree-shakeable ESM | ✅ |

## API

### Transform

| Method | Description |
|---|---|
| `.resize(w?, h?, opts?)` | Resize. `opts.fit`: cover / contain / fill / inside / outside |
| `.crop({ left, top, width, height })` | Extract a region |
| `.rotate(angle, opts?)` | Rotate by degrees |
| `.flip()` | Flip vertically |
| `.flop()` | Flip horizontally |
| `.format(type, opts?)` | Set output format: jpeg / png / webp / avif / tiff |
| `.jpeg(opts?)` `.png(opts?)` `.webp(opts?)` `.avif(opts?)` | Format shorthands |
| `.quality(1–100)` | Set output quality |
| `.blur(sigma?)` | Gaussian blur |
| `.sharpen(opts?)` | Unsharp mask |
| `.median(size?)` | Median filter |
| `.grayscale()` | Convert to greyscale |
| `.tint({ r, g, b })` | Apply color tint |
| `.negate()` | Invert colors |
| `.brightness(value)` | Brightness multiplier (1 = no change) |
| `.contrast({ value })` | Contrast multiplier (1 = no change) |
| `.saturation(value)` | Saturation multiplier |
| `.composite(opts)` | Overlay / watermark |
| `.stripMeta()` | Remove EXIF and ICC metadata |

### AI

| Method | Description |
|---|---|
| `.removeBackground()` | ONNX-based bg removal, runs locally, no API key |
| `.smartCrop(subject)` | Face / object aware crop |
| `.upscale(factor)` | 2× or 4× via ESRGAN |

### Output

| Method | Returns |
|---|---|
| `.toBuffer()` | `Buffer` (Node) / `Uint8Array` (Browser) |
| `.toFile(path)` | `Promise<void>` — Node only |
| `.toStream()` | `ReadableStream<Uint8Array>` |
| `.toDataURL()` | `Promise<string>` — base64 data URI |
| `.meta()` | `Promise<MetadataResult>` — reads metadata, no processing |

## License

MIT
