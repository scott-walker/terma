import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Plus, Loader2 } from 'lucide-react'

interface BranchEntry {
  name: string
  current: boolean
  isRemote: boolean
}

interface GitBranchDropdownProps {
  cwd: string
  anchorRef: React.RefObject<HTMLElement | null>
  onCheckout: () => void
  onClose: () => void
}

export function GitBranchDropdown({ cwd, anchorRef, onCheckout, onClose }: GitBranchDropdownProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [branches, setBranches] = useState<BranchEntry[]>([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const [paneActiveColor, setPaneActiveColor] = useState<string | null>(null)

  // Compute position and inherit pane-active color from anchor (portal breaks CSS var inheritance)
  useEffect(() => {
    const el = anchorRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPos({ top: rect.bottom + 4, left: rect.left })
    const color = getComputedStyle(el).getPropertyValue('--color-pane-active').trim()
    if (color) setPaneActiveColor(color)
  }, [anchorRef])

  // Load branches on mount
  useEffect(() => {
    window.api.git.listBranches(cwd).then((list) => {
      setBranches(list)
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })
  }, [cwd])

  // Focus input on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  // Close on click outside / Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    })
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  const normalizedFilter = filter.trim().toLowerCase()

  const localBranches = branches.filter((b) => !b.isRemote)
  const remoteBranches = branches.filter((b) => b.isRemote)

  const filteredLocal = normalizedFilter
    ? localBranches.filter((b) => b.name.toLowerCase().includes(normalizedFilter))
    : localBranches

  const filteredRemote = normalizedFilter
    ? remoteBranches.filter((b) => b.name.toLowerCase().includes(normalizedFilter))
    : remoteBranches

  // Determine if the typed name is a new branch (no exact match among local)
  const exactLocalMatch = localBranches.some((b) => b.name.toLowerCase() === normalizedFilter)
  const exactRemoteMatch = remoteBranches.some((b) => b.name.toLowerCase() === normalizedFilter)
  const showCreate = normalizedFilter.length > 0 && !exactLocalMatch && !exactRemoteMatch

  const handleCheckout = useCallback(async (branch: string) => {
    setActing(true)
    setError(null)
    try {
      await window.api.git.checkout(cwd, branch)
      onCheckout()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setActing(false)
    }
  }, [cwd, onCheckout, onClose])

  const handleCreate = useCallback(async () => {
    const name = filter.trim()
    if (!name) return
    setActing(true)
    setError(null)
    try {
      await window.api.git.createBranch(cwd, name)
      onCheckout()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed')
      setActing(false)
    }
  }, [cwd, filter, onCheckout, onClose])

  if (!pos) return <></>

  return createPortal(
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        style={{ top: pos.top, left: pos.left, ...(paneActiveColor ? { '--color-pane-active': paneActiveColor } as React.CSSProperties : {}) }}
        className="fixed z-50 min-w-[260px] rounded-md border border-border bg-popup-bg shadow-xl"
      >
        {/* Filter / create input */}
        <div className="border-b border-border px-2 py-1.5">
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => { setFilter(e.target.value); setError(null) }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && showCreate) {
                e.preventDefault()
                handleCreate()
              }
            }}
            placeholder="Filter or create branch..."
            className="w-full rounded-sm bg-surface-hover px-2 py-1 text-xs text-fg outline-none placeholder:text-fg-muted/50"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="px-3 py-1.5 text-xs text-danger">{error}</div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center px-3 py-3">
            <Loader2 size={16} className="animate-spin text-fg-muted" />
          </div>
        ) : (
          <div className="max-h-[280px] overflow-y-auto py-1">
            {/* Local branches */}
            {filteredLocal.map((branch) => (
              <button
                key={branch.name}
                disabled={acting || branch.current}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!branch.current) handleCheckout(branch.name)
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition-colors ${
                  branch.current
                    ? 'text-pane-active'
                    : 'text-fg hover:bg-surface-hover'
                }`}
              >
                <span className="flex-1 truncate">{branch.name}</span>
                {branch.current && <Check size={14} strokeWidth={2} className="shrink-0 text-pane-active" />}
              </button>
            ))}

            {/* Remote branches */}
            {filteredRemote.length > 0 && (
              <>
                {filteredLocal.length > 0 && <div className="my-1 border-t border-border" />}
                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-fg-muted/60">Remote</div>
                {filteredRemote.map((branch) => (
                  <button
                    key={branch.name}
                    disabled={acting}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCheckout(branch.name)
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                  >
                    <span className="flex-1 truncate">{branch.name}</span>
                  </button>
                ))}
              </>
            )}

            {/* No results */}
            {filteredLocal.length === 0 && filteredRemote.length === 0 && !showCreate && (
              <div className="px-3 py-2 text-sm text-fg-muted">No branches found</div>
            )}

            {/* Create new branch */}
            {showCreate && (
              <>
                <div className="my-1 border-t border-border" />
                <button
                  disabled={acting}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleCreate()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-pane-active transition-colors hover:bg-surface-hover"
                >
                  <Plus size={14} strokeWidth={2} className="shrink-0" />
                  <span className="truncate">Create &amp; checkout <span className="font-medium">{filter.trim()}</span></span>
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
