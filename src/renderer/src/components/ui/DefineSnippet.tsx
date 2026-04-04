import { useEffect, useRef, useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

interface DefineSnippetProps {
  position: { x: number; y: number }
  original: string
  definition: string | null
  onRephrase: () => void
  onClose: () => void
}

export function DefineSnippet({ position, original, definition, onRephrase, onClose }: DefineSnippetProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [rephrasing, setRephrasing] = useState(false)

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
  }, [position, clampPosition, definition])

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

  const handleCopy = useCallback(async () => {
    if (!definition) return
    await navigator.clipboard.writeText(definition)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [definition])

  const handleRephrase = useCallback(() => {
    setRephrasing(true)
    onRephrase()
  }, [onRephrase])

  // Reset rephrasing flag when new definition arrives
  useEffect(() => {
    if (definition !== null) setRephrasing(false)
  }, [definition])

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
          <span className="text-xs font-medium text-fg-muted">Define</span>
          <button
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded text-fg-muted hover:bg-surface-hover hover:text-fg"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1l8 8M9 1l-8 8" />
            </svg>
          </button>
        </div>

        {/* Original text */}
        <div className="border-b border-border px-3 py-2.5">
          <p className="line-clamp-3 text-sm text-fg-muted">{original}</p>
        </div>

        {/* Definition */}
        <div className="px-3 py-3">
          {definition === null ? (
            <div className="flex items-center gap-2 text-base text-fg-secondary">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-fg-muted border-t-accent" />
              <span>{rephrasing ? 'Rephrasing…' : 'Defining…'}</span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-base text-fg">{definition}</p>
          )}
        </div>

        {/* Footer */}
        {definition !== null && (
          <div className="flex justify-end gap-1 border-t border-border px-3 py-1.5">
            <button
              onClick={handleRephrase}
              className="rounded px-2 py-0.5 text-xs text-fg-secondary hover:bg-surface-hover hover:text-fg"
            >
              Rephrase
            </button>
            <button
              onClick={handleCopy}
              className="rounded px-2 py-0.5 text-xs text-fg-secondary hover:bg-surface-hover hover:text-fg"
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
