'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Upload, Download, ImageIcon } from 'lucide-react'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const MAX_FILE_SIZE = 10 * 1024 * 1024

type OutputFormat = 'webp' | 'avif' | 'jpeg' | 'png'
type PanelTab = 'visual' | 'code'
type PreviewTab = 'before' | 'after'

interface Settings {
  format: OutputFormat
  quality: number
  resize: boolean
  width: number | null
  grayscale: boolean
  removeBackground: boolean
  sharpen: boolean
}

interface OriginalMeta {
  width: number
  height: number
  format: string
  size: number
}

interface ResultMeta {
  width: number
  height: number
  format: string
  sizeAfter: number
  timing: number
}

interface Op {
  op: string
  [key: string]: unknown
}

const DEFAULT_SETTINGS: Settings = {
  format: 'webp',
  quality: 85,
  resize: false,
  width: null,
  grayscale: false,
  removeBackground: false,
  sharpen: false,
}

const FORMATS: readonly OutputFormat[] = ['webp', 'avif', 'jpeg', 'png']

function buildOps(s: Settings): Op[] {
  const ops: Op[] = []
  if (s.resize && s.width != null) ops.push({ op: 'resize', width: s.width })
  if (s.grayscale) ops.push({ op: 'grayscale' })
  if (s.sharpen) ops.push({ op: 'sharpen' })
  if (s.removeBackground) ops.push({ op: 'removeBackground' })
  const compressOptions: Record<string, unknown> = { format: s.format }
  if (s.format !== 'png') compressOptions['quality'] = s.quality
  ops.push({ op: 'compress', options: compressOptions })
  return ops
}

function buildCode(s: Settings): string {
  const lines = [
    "import { img } from 'imgcraft'",
    '',
    'const result = await img(uploadedImage)',
  ]
  if (s.resize && s.width != null) lines.push(`  .resize(${s.width})`)
  if (s.grayscale) lines.push('  .grayscale()')
  if (s.sharpen) lines.push('  .sharpen()')
  if (s.removeBackground) lines.push('  .removeBackground()')
  if (s.format === 'png') {
    lines.push("  .compress({ format: 'png' })")
  } else {
    lines.push(`  .compress({ format: '${s.format}', quality: ${s.quality} })`)
  }
  lines.push('  .toBuffer()')
  return lines.join('\n')
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

function formatBytes(b: number): string {
  if (b < 1024) return `${b}B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`
  return `${(b / (1024 * 1024)).toFixed(1)}MB`
}

type EffectKey = 'grayscale' | 'removeBackground' | 'sharpen'

const EFFECTS: Array<{ key: EffectKey; label: string; note?: string }> = [
  { key: 'grayscale', label: 'Grayscale' },
  { key: 'removeBackground', label: 'Remove Background', note: 'AI — slow first run' },
  { key: 'sharpen', label: 'Sharpen' },
]

export default function PlaygroundPage() {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [originalPreview, setOriginalPreview] = useState<string | null>(null)
  const [originalMeta, setOriginalMeta] = useState<OriginalMeta | null>(null)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [resultMeta, setResultMeta] = useState<ResultMeta | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<PanelTab>('visual')
  const [activePreview, setActivePreview] = useState<PreviewTab>('before')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [code, setCode] = useState(() => buildCode(DEFAULT_SETTINGS))
  const [dragOver, setDragOver] = useState(false)
  const [resizeWidthInput, setResizeWidthInput] = useState('800')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragCounterRef = useRef(0)
  const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? ''

  useEffect(() => {
    setCode(buildCode(settings))
  }, [settings])

  const handleFileSelect = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        setError('File exceeds 10MB limit.')
        return
      }
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file.')
        return
      }
      setError(null)
      if (originalPreview != null) URL.revokeObjectURL(originalPreview)

      const url = URL.createObjectURL(file)
      setUploadedFile(file)
      setOriginalPreview(url)
      setActivePreview('before')
      setProcessedUrl(null)
      setResultMeta(null)

      const imgEl = new window.Image()
      imgEl.onload = () => {
        setOriginalMeta({
          width: imgEl.naturalWidth,
          height: imgEl.naturalHeight,
          format: file.type.replace('image/', ''),
          size: file.size,
        })
      }
      imgEl.src = url
    },
    [originalPreview],
  )

  const handleRun = useCallback(async () => {
    if (uploadedFile == null) {
      setError('Upload an image first.')
      return
    }
    setIsProcessing(true)
    setError(null)

    const t0 = Date.now()
    try {
      const ops = activeTab === 'visual' ? buildOps(settings) : parseOps(code)
      const form = new FormData()
      form.append('image', uploadedFile)
      form.append('ops', JSON.stringify(ops))

      const res = await fetch(`${apiUrl}/transform`, { method: 'POST', body: form })
      if (!res.ok) {
        if (res.status === 503 || res.status === 504) {
          throw new Error(
            'Server warming up — Render free tier cold starts in ~30s. Try again.',
          )
        }
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const timing = Date.now() - t0

      if (processedUrl != null) URL.revokeObjectURL(processedUrl)
      const url = URL.createObjectURL(blob)

      const imgEl = new window.Image()
      imgEl.onload = () => {
        setResultMeta({
          width: imgEl.naturalWidth,
          height: imgEl.naturalHeight,
          format: blob.type.replace('image/', ''),
          sizeAfter: blob.size,
          timing,
        })
      }
      imgEl.src = url

      setProcessedUrl(url)
      setActivePreview('after')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsProcessing(false)
    }
  }, [uploadedFile, activeTab, settings, code, apiUrl, processedUrl])

  const handleDownload = useCallback(() => {
    if (processedUrl == null) return
    const a = document.createElement('a')
    a.href = processedUrl
    a.download = `result.${resultMeta?.format ?? settings.format}`
    a.click()
  }, [processedUrl, resultMeta, settings.format])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current++
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragCounterRef.current--
    if (dragCounterRef.current === 0) setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      dragCounterRef.current = 0
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file != null) handleFileSelect(file)
    },
    [handleFileSelect],
  )

  const updateSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }, [])

  const reduction =
    originalMeta != null && resultMeta != null
      ? Math.round((1 - resultMeta.sizeAfter / originalMeta.size) * 100)
      : null

  const reductionColor =
    reduction == null ? 'var(--text)' : reduction > 50 ? '#22c55e' : reduction > 20 ? '#f59e0b' : 'var(--text)'

  const currentOps = activeTab === 'visual' ? buildOps(settings) : parseOps(code)

  return (
    <div className="pg2-layout">
      {/* LEFT PANEL */}
      <div className="pg2-left">
        <div className="pg2-scroll">
          {/* Upload zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f != null) handleFileSelect(f)
            }}
          />
          <div
            className="pg2-upload-zone"
            style={{
              borderColor: dragOver ? 'var(--accent)' : 'var(--border)',
              background: dragOver ? 'rgba(34,197,94,0.05)' : 'transparent',
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            {uploadedFile != null && originalPreview != null ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalPreview}
                  alt=""
                  style={{
                    width: '48px',
                    height: '48px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    flexShrink: 0,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: 'var(--text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {uploadedFile.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {formatBytes(uploadedFile.size)}
                    {originalMeta != null && ` · ${originalMeta.width}×${originalMeta.height}`}
                  </div>
                </div>
                <div
                  style={{
                    marginLeft: 'auto',
                    fontSize: '11px',
                    color: 'var(--accent)',
                    flexShrink: 0,
                  }}
                >
                  Change
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Upload
                  size={24}
                  style={{ color: 'var(--text-muted)', marginBottom: '8px', opacity: 0.6 }}
                />
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Drop image or{' '}
                  <span style={{ color: 'var(--accent)' }}>click to upload</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Max 10MB · PNG, JPEG, WebP, AVIF
                </div>
              </div>
            )}
          </div>

          {/* Tab switcher */}
          <div className="pg2-tabs">
            {(['visual', 'code'] as const).map((tab) => (
              <button
                key={tab}
                className={`pg2-tab${activeTab === tab ? ' pg2-tab-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'visual' ? 'Visual' : 'Code'}
              </button>
            ))}
          </div>

          {/* Visual tab */}
          {activeTab === 'visual' && (
            <div className="pg2-controls">
              <div className="pg2-control-group">
                <label className="pg2-label">Output Format</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      className={`pg2-format-btn${settings.format === fmt ? ' active' : ''}`}
                      onClick={() => updateSetting('format', fmt)}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {settings.format !== 'png' && (
                <div className="pg2-control-group">
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '10px',
                    }}
                  >
                    <label className="pg2-label" style={{ marginBottom: 0 }}>
                      Quality
                    </label>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--accent)',
                        fontFamily: 'var(--font-mono), monospace',
                        minWidth: '28px',
                        textAlign: 'right',
                      }}
                    >
                      {settings.quality}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={settings.quality}
                    onChange={(e) => updateSetting('quality', Number(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </div>
              )}

              <div className="pg2-control-group">
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: settings.resize ? '10px' : 0,
                  }}
                >
                  <label className="pg2-label" style={{ marginBottom: 0 }}>
                    Resize
                  </label>
                  <input
                    type="checkbox"
                    checked={settings.resize}
                    onChange={(e) => updateSetting('resize', e.target.checked)}
                    style={{
                      accentColor: 'var(--accent)',
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer',
                    }}
                  />
                </div>
                {settings.resize && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      placeholder="800"
                      value={resizeWidthInput}
                      onChange={(e) => {
                        setResizeWidthInput(e.target.value)
                        const n = parseInt(e.target.value, 10)
                        updateSetting('width', !isNaN(n) && n > 0 ? n : null)
                      }}
                      className="pg2-input"
                    />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>px wide</span>
                  </div>
                )}
              </div>

              <div className="pg2-control-group">
                <label className="pg2-label">Effects</label>
                {EFFECTS.map(({ key, label, note }) => (
                  <label
                    key={key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '12px',
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={settings[key]}
                      onChange={(e) => updateSetting(key, e.target.checked)}
                      style={{
                        accentColor: 'var(--accent)',
                        width: '15px',
                        height: '15px',
                        flexShrink: 0,
                        cursor: 'pointer',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                      {label}
                      {note != null && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-muted)',
                            marginLeft: '6px',
                          }}
                        >
                          {note}
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Code tab */}
          {activeTab === 'code' && (
            <div className="pg2-controls">
              <div className="pg2-control-group">
                <label className="pg2-label">Code</label>
                <div
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <MonacoEditor
                    height="220px"
                    language="typescript"
                    value={code}
                    onChange={(v) => setCode(v ?? '')}
                    theme="vs-dark"
                    options={{
                      fontSize: 12,
                      fontFamily: 'var(--font-mono), Menlo, monospace',
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      lineNumbers: 'on',
                      renderLineHighlight: 'none',
                      padding: { top: 12, bottom: 12 },
                      overviewRulerLanes: 0,
                      hideCursorInOverviewRuler: true,
                      overviewRulerBorder: false,
                      wordWrap: 'on',
                    }}
                  />
                </div>
              </div>
              <div className="pg2-control-group">
                <label
                  className="pg2-label"
                  style={{ fontSize: '10px', letterSpacing: '0.06em' }}
                >
                  ops JSON (sent to API)
                </label>
                <pre
                  style={{
                    background: 'var(--code-bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    margin: 0,
                    maxHeight: '160px',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                    fontFamily: 'var(--font-mono), monospace',
                  }}
                >
                  {JSON.stringify(currentOps, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Run button — sticky footer */}
        <div className="pg2-footer">
          <button
            className="pg2-run-btn"
            onClick={handleRun}
            disabled={isProcessing || uploadedFile == null}
          >
            {isProcessing ? (
              <>
                <span className="pg2-spinner" />
                Processing...
              </>
            ) : (
              'Process Image →'
            )}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="pg2-right">
        {/* Before/After tabs */}
        {uploadedFile != null && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            {(['before', 'after'] as const).map((tab) => {
              const disabled = tab === 'after' && processedUrl == null
              return (
                <button
                  key={tab}
                  onClick={() => !disabled && setActivePreview(tab)}
                  disabled={disabled}
                  style={{
                    padding: '4px 14px',
                    borderRadius: '99px',
                    fontSize: '12px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: disabled ? 'default' : 'pointer',
                    background: activePreview === tab ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: activePreview === tab ? '#09090b' : disabled ? 'var(--text-muted)' : 'var(--text)',
                    opacity: disabled ? 0.4 : 1,
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {tab === 'before' ? 'Before' : 'After'}
                </button>
              )
            })}
          </div>
        )}

        {/* Preview area */}
        <div className="pg2-preview-area">
          {uploadedFile == null ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <ImageIcon size={40} style={{ marginBottom: '12px', opacity: 0.25 }} />
              <p style={{ fontSize: '14px' }}>Upload an image to get started</p>
            </div>
          ) : isProcessing ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div className="pg2-spinner-large" />
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Processing...</p>
            </div>
          ) : (
            <>
              {activePreview === 'before' && originalPreview != null && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={originalPreview}
                  alt="Original"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              )}
              {activePreview === 'after' && processedUrl != null && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={processedUrl}
                  alt="Processed"
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              )}
            </>
          )}
        </div>

        {/* Stats bar */}
        {(originalMeta != null || resultMeta != null) && (
          <div className="pg2-stats">
            {originalMeta != null && (
              <div className="pg2-stats-row">
                <span className="pg2-stats-label">Before</span>
                <span style={{ fontWeight: 600 }}>{formatBytes(originalMeta.size)}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {originalMeta.format.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {originalMeta.width}&times;{originalMeta.height}
                </span>
              </div>
            )}
            {resultMeta != null && (
              <div className="pg2-stats-row">
                <span className="pg2-stats-label">After</span>
                <span style={{ fontWeight: 600 }}>{formatBytes(resultMeta.sizeAfter)}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {resultMeta.format.toUpperCase()}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {resultMeta.width}&times;{resultMeta.height}
                </span>
                {reduction != null && (
                  <span style={{ fontWeight: 700, color: reductionColor }}>-{reduction}%</span>
                )}
                <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {resultMeta.timing < 1000
                    ? `${resultMeta.timing}ms`
                    : `${(resultMeta.timing / 1000).toFixed(1)}s`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error != null && <div className="pg2-error">{error}</div>}

        {/* Download button */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <button
            className="pg2-download-btn"
            onClick={handleDownload}
            disabled={processedUrl == null}
          >
            <Download size={14} />
            Download {(resultMeta?.format ?? settings.format).toUpperCase()} &#8595;
          </button>
        </div>
      </div>
    </div>
  )
}
