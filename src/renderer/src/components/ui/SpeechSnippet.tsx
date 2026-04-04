import { useEffect, useRef, useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface SpeechSnippetProps {
  position: { x: number; y: number }
  text: string
  streamId: string | null
  sampleRate: number
  onClose: () => void
}

type PlayState = 'loading' | 'playing' | 'paused' | 'ended'

export function SpeechSnippet({ position, text, streamId, sampleRate, onClose }: SpeechSnippetProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const gainRef = useRef<GainNode | null>(null)
  const nextTimeRef = useRef(0)
  const playedSamplesRef = useRef(0)
  const totalSamplesRef = useRef(0)
  const streamDoneRef = useRef(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const [state, setState] = useState<PlayState>('loading')
  const [progress, setProgress] = useState(0)
  const animFrameRef = useRef<number>(0)

  const clampPosition = useCallback((pos: { x: number; y: number }) => {
    const el = ref.current
    if (!el) return pos
    const { innerWidth, innerHeight } = window
    const rect = el.getBoundingClientRect()
    return {
      x: pos.x + rect.width > innerWidth ? innerWidth - rect.width - 8 : pos.x,
      y: pos.y + rect.height > innerHeight ? innerHeight - rect.height - 8 : pos.y
    }
  }, [])

  useEffect(() => {
    if (!ref.current) return
    const clamped = clampPosition(position)
    ref.current.style.left = `${clamped.x}px`
    ref.current.style.top = `${clamped.y}px`
  }, [position, clampPosition, streamId])

  // Progress tracking via animation frame
  const startProgressTracking = useCallback(() => {
    const tick = (): void => {
      const ctx = ctxRef.current
      if (!ctx || state === 'ended') return

      const total = totalSamplesRef.current
      if (total > 0 && streamDoneRef.current) {
        // Once stream is done, use elapsed time for smooth progress
        const elapsed = ctx.currentTime
        const startOffset = nextTimeRef.current - (total / sampleRate)
        const played = Math.max(0, elapsed - Math.max(0, startOffset))
        const duration = total / sampleRate
        setProgress(Math.min(played / duration, 1) * 100)
      }
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [sampleRate, state])

  // Cleanup everything
  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }
    if (cleanupRef.current) {
      cleanupRef.current()
      cleanupRef.current = null
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => {})
      ctxRef.current = null
    }
    gainRef.current = null
  }, [])

  useEffect(() => cleanup, [cleanup])

  // Subscribe to stream when streamId arrives
  useEffect(() => {
    if (!streamId) return

    const ctx = new AudioContext({ sampleRate })
    ctxRef.current = ctx
    const gain = ctx.createGain()
    gain.connect(ctx.destination)
    gainRef.current = gain
    nextTimeRef.current = 0
    playedSamplesRef.current = 0
    totalSamplesRef.current = 0
    streamDoneRef.current = false

    let firstChunk = true

    const unsub = window.api.tts.onStream(streamId, (event) => {
      if (event.type === 'chunk') {
        // Decode base64 → Int16 PCM → Float32
        const binary = atob(event.data)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
        const int16 = new Int16Array(bytes.buffer)
        const float32 = new Float32Array(int16.length)
        for (let i = 0; i < int16.length; i++) {
          float32[i] = int16[i] / 32768
        }

        totalSamplesRef.current += float32.length

        // Schedule AudioBuffer
        const buffer = ctx.createBuffer(1, float32.length, sampleRate)
        buffer.getChannelData(0).set(float32)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(gain)

        const now = ctx.currentTime
        if (firstChunk || nextTimeRef.current < now) {
          nextTimeRef.current = now
          firstChunk = false
        }
        source.start(nextTimeRef.current)
        nextTimeRef.current += buffer.duration

        setState('playing')
      } else if (event.type === 'done') {
        streamDoneRef.current = true
        // Schedule end state after all audio finishes
        const remaining = Math.max(0, nextTimeRef.current - ctx.currentTime)
        setTimeout(() => {
          setState('ended')
          setProgress(100)
        }, remaining * 1000)
      } else if (event.type === 'error') {
        setState('ended')
      }
    })

    cleanupRef.current = unsub

    return () => {
      unsub()
      cleanupRef.current = null
    }
  }, [streamId, sampleRate])

  // Start progress animation when playing
  useEffect(() => {
    if (state === 'playing') {
      startProgressTracking()
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [state, startProgressTracking])

  // Escape / click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    const handleClickOutside = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [onClose])

  const handleClose = useCallback(() => {
    cleanup()
    onClose()
  }, [cleanup, onClose])

  const handlePauseResume = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    if (state === 'playing') {
      ctx.suspend()
      setState('paused')
    } else if (state === 'paused') {
      ctx.resume()
      setState('playing')
    }
  }, [state])

  const handleStop = useCallback(() => {
    cleanup()
    setState('ended')
    setProgress(0)
  }, [cleanup])

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 max-w-sm min-w-[200px] rounded-lg border border-border bg-popup-bg shadow-xl"
        style={{ left: position.x, top: position.y }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
          <span className="text-xs font-medium text-fg-muted">Speak</span>
          <button
            onClick={handleClose}
            className="flex h-5 w-5 items-center justify-center rounded text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>

        {/* Text */}
        <div className="border-b border-border px-3 py-2.5">
          <p className="line-clamp-3 text-sm text-fg-muted">{text}</p>
        </div>

        {/* Controls */}
        <div className="px-3 py-3">
          {state === 'loading' ? (
            <div className="flex items-center gap-2 text-base text-fg-secondary">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-fg-muted border-t-accent" />
              <span>Connecting…</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {/* Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseResume}
                  disabled={state === 'ended'}
                  className="rounded px-2 py-0.5 text-xs text-fg-secondary hover:bg-surface-hover hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  {state === 'paused' ? 'Resume' : state === 'playing' ? 'Pause' : 'Play'}
                </button>
                <button
                  onClick={handleStop}
                  disabled={state === 'ended'}
                  className="rounded px-2 py-0.5 text-xs text-fg-secondary hover:bg-surface-hover hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Stop
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
