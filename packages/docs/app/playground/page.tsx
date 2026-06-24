'use client'

import { useRef, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Play, Upload, Download } from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const DEFAULT_CODE = `import { img } from 'imgcraft'

const result = await img(uploadedImage)
  .compress({ quality: 80 })
  .toBuffer()`

interface Op {
  op: string
  options?: Record<string, unknown>
  [key: string]: unknown
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  }
}

function parseOps(code: string): Op[] {
  const ops: Op[] = []

  const compressMatch = code.match(/\.compress\(\s*\{([^}]*)\}\s*\)/)
  if (compressMatch != null) {
    const inner = compressMatch[1] ?? ''
    const cOpts: Record<string, unknown> = {}
    const cQual = inner.match(/quality:\s*(\d+)/)
    if (cQual != null) cOpts['quality'] = Number(cQual[1])
    const cFmt = inner.match(/format:\s*['"](\w+)['"]/)
    if (cFmt != null) cOpts['format'] = cFmt[1]
    const cEffort = inner.match(/effort:\s*(\d+)/)
    if (cEffort != null) cOpts['effort'] = Number(cEffort[1])
    ops.push({ op: 'compress', options: cOpts })
  } else if (code.includes('.compress(')) {
    ops.push({ op: 'compress', options: {} })
  }

  const resizeMatch = code.match(/\.resize\(\s*(\d+)(?:\s*,\s*(\d+))?\s*\)/)
  if (resizeMatch != null) {
    const options: Record<string, unknown> = { width: Number(resizeMatch[1]) }
    if (resizeMatch[2] != null) options['height'] = Number(resizeMatch[2])
    ops.push({ op: 'resize', options })
  }

  const rotateMatch = code.match(/\.rotate\(\s*(\d+)\s*\)/)
  if (rotateMatch != null) {
    ops.push({ op: 'rotate', options: { angle: Number(rotateMatch[1]) } })
  } else if (code.includes('.rotate(')) {
    ops.push({ op: 'rotate', options: { angle: 90 } })
  }

  if (code.includes('.flip(')) ops.push({ op: 'flip' })
  if (code.includes('.flop(')) ops.push({ op: 'flop' })

  const formats = ['jpeg', 'png', 'webp', 'avif'] as const
  let formatPushed = false
  for (const fmt of formats) {
    const qualMatch = code.match(
      new RegExp(`\\.${fmt}\\(\\s*\\{[^}]*quality:\\s*(\\d+)[^}]*\\}\\s*\\)`) as RegExp,
    )
    if (qualMatch != null) {
      ops.push({ op: 'format', options: { format: fmt, quality: Number(qualMatch[1]) } })
      formatPushed = true
      break
    }
    if (code.includes(`.${fmt}(`)) {
      ops.push({ op: 'format', options: { format: fmt } })
      formatPushed = true
      break
    }
  }
  if (!formatPushed && code.includes('.format(')) {
    const fmtMatch = code.match(/\.format\(\s*['"](\w+)['"]\s*\)/)
    if (fmtMatch != null) ops.push({ op: 'format', options: { format: fmtMatch[1] } })
  }

  const blurMatch = code.match(/\.blur\(\s*([\d.]+)\s*\)/)
  if (blurMatch != null) {
    ops.push({ op: 'blur', options: { sigma: Number(blurMatch[1]) } })
  } else if (code.includes('.blur(')) {
    ops.push({ op: 'blur', options: {} })
  }

  if (code.includes('.sharpen(')) ops.push({ op: 'sharpen', options: {} })
  if (code.includes('.grayscale(')) ops.push({ op: 'grayscale' })
  if (code.includes('.negate(')) ops.push({ op: 'negate' })

  const tintMatch = code.match(/\.tint\(\s*['"]([^'"]+)['"]\s*\)/)
  if (tintMatch != null && tintMatch[1] != null) ops.push({ op: 'tint', options: hexToRgb(tintMatch[1]) })

  const brightnessMatch = code.match(/\.brightness\(\s*([\d.]+)\s*\)/)
  if (brightnessMatch != null)
    ops.push({ op: 'brightness', options: { brightness: Number(brightnessMatch[1]) } })

  const contrastMatch = code.match(/\.contrast\(\s*([\d.]+)\s*\)/)
  if (contrastMatch != null)
    ops.push({ op: 'contrast', options: { value: Number(contrastMatch[1]) } })

  const saturationMatch = code.match(/\.saturation\(\s*([\d.]+)\s*\)/)
  if (saturationMatch != null)
    ops.push({ op: 'saturation', options: { saturation: Number(saturationMatch[1]) } })

  if (code.includes('.removeBackground(')) ops.push({ op: 'removeBackground' })

  const upscaleMatch = code.match(/\.upscale\(\s*(\d+)\s*\)/)
  if (upscaleMatch != null) {
    ops.push({ op: 'upscale', options: { factor: Number(upscaleMatch[1]) as 2 | 4 } })
  } else if (code.includes('.upscale(')) {
    ops.push({ op: 'upscale', options: { factor: 2 } })
  }

  const smartCropMatch = code.match(/\.smartCrop\(\s*['"]([^'"]+)['"]\s*\)/)
  if (smartCropMatch != null) {
    ops.push({ op: 'smartCrop', options: { subject: smartCropMatch[1] } })
  } else if (code.includes('.smartCrop(')) {
    ops.push({ op: 'smartCrop', options: {} })
  }

  if (code.includes('.stripMeta(')) ops.push({ op: 'stripMeta' })

  return ops
}

interface ResultMeta {
  width: number
  height: number
  format: string
  sizeBefore: number
  sizeAfter: number
  timing: number
}

export default function PlaygroundPage() {
  const [code, setCode] = useState(DEFAULT_CODE)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [meta, setMeta] = useState<ResultMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const resultBlobRef = useRef<Blob | null>(null)

  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''

  const handleUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file != null) setImageFile(file)
  }, [])

  const handleRun = useCallback(async () => {
    if (imageFile == null) {
      setError('Upload an image first.')
      return
    }
    setLoading(true)
    setError(null)
    setResultUrl(null)
    setMeta(null)

    const t0 = Date.now()
    try {
      const ops = parseOps(code)
      const form = new FormData()
      form.append('image', imageFile)
      form.append('ops', JSON.stringify(ops))

      const res = await fetch(`${apiUrl}/transform`, { method: 'POST', body: form })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const timing = Date.now() - t0

      if (resultUrl != null) URL.revokeObjectURL(resultUrl)
      const url = URL.createObjectURL(blob)

      const imgEl = new Image()
      imgEl.onload = () => {
        setMeta({
          width: imgEl.naturalWidth,
          height: imgEl.naturalHeight,
          format: blob.type.replace('image/', ''),
          sizeBefore: imageFile.size,
          sizeAfter: blob.size,
          timing,
        })
      }
      imgEl.src = url

      resultBlobRef.current = blob
      setResultUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [code, imageFile, apiUrl, resultUrl])

  const handleDownload = useCallback(() => {
    if (resultBlobRef.current == null || resultUrl == null) return
    const a = document.createElement('a')
    a.href = resultUrl
    a.download = `result.${meta?.format ?? 'webp'}`
    a.click()
  }, [resultUrl, meta])

  const formatBytes = (b: number) => {
    if (b < 1024) return `${b}B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`
    return `${(b / (1024 * 1024)).toFixed(1)}MB`
  }

  return (
    <div className="playground-layout">
      <div className="playground-panel">
        <div className="playground-panel-header">
          <span className="playground-panel-title">Editor</span>
          <div className="playground-panel-actions">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
            <button
              className="btn-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} />
              {imageFile != null ? imageFile.name : 'Upload Image'}
            </button>
            <button
              className="btn-run"
              onClick={handleRun}
              disabled={loading}
            >
              <Play size={13} />
              {loading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>
        <div className="playground-editor">
          <MonacoEditor
            height="100%"
            language="typescript"
            value={code}
            onChange={(v) => setCode(v ?? '')}
            theme="vs-dark"
            options={{
              fontSize: 13,
              fontFamily: 'var(--font-mono), Menlo, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              lineNumbers: 'on',
              renderLineHighlight: 'none',
              padding: { top: 16, bottom: 16 },
              overviewRulerLanes: 0,
              hideCursorInOverviewRuler: true,
              overviewRulerBorder: false,
            }}
          />
        </div>
      </div>

      <div className="playground-panel">
        <div className="playground-panel-header">
          <span className="playground-panel-title">Preview</span>
          <div className="playground-panel-actions">
            {resultUrl != null && (
              <button className="btn-download" onClick={handleDownload}>
                <Download size={13} />
                Download
              </button>
            )}
          </div>
        </div>
        <div className="playground-preview">
          {loading && <div className="playground-spinner" />}
          {!loading && error != null && (
            <div className="playground-error">{error}</div>
          )}
          {!loading && resultUrl != null && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={resultUrl}
              alt="Processed result"
              className="playground-preview-img"
            />
          )}
          {!loading && resultUrl == null && error == null && (
            <div className="playground-preview-empty">
              <Upload size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
              <p>Upload an image and click Run</p>
            </div>
          )}
          {meta != null && (
            <div className="playground-meta">
              <span className="playground-meta-item">
                Size
                <span className="playground-meta-value">
                  {meta.width} &times; {meta.height}
                </span>
              </span>
              <span className="playground-meta-item">
                Format
                <span className="playground-meta-value">{meta.format}</span>
              </span>
              <span className="playground-meta-item">
                Before
                <span className="playground-meta-value">{formatBytes(meta.sizeBefore)}</span>
              </span>
              <span className="playground-meta-item">
                After
                <span className="playground-meta-value">{formatBytes(meta.sizeAfter)}</span>
              </span>
              <span className="playground-meta-item">
                Time
                <span className="playground-meta-value">{meta.timing}ms</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
