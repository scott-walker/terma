import { useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Kbd } from './Kbd'

export interface MenuAction {
  type: 'item'
  label: string
  shortcut?: string
  disabled?: boolean
  onAction: () => void
}

export interface MenuSeparator {
  type: 'separator'
}

export interface MenuColorPicker {
  type: 'colors'
  colors: Array<{ id: string; label: string }>
  activeColor: string | null
  onSelect: (colorId: string | null) => void
}

export type MenuEntry = MenuAction | MenuSeparator | MenuColorPicker

interface ContextMenuProps {
  position: { x: number; y: number } | null
  entries: MenuEntry[]
  onClose: () => void
}

const COLOR_BG_CLASSES: Record<string, string> = {
  red: 'bg-tab-red',
  orange: 'bg-tab-orange',
  yellow: 'bg-tab-yellow',
  green: 'bg-tab-green',
  blue: 'bg-tab-blue',
  purple: 'bg-tab-purple'
}

export function ContextMenu({ position, entries, onClose }: ContextMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)

  const clampPosition = useCallback(
    (pos: { x: number; y: number }) => {
      const menu = menuRef.current
      if (!menu) return pos
      const { innerWidth, innerHeight } = window
      const rect = menu.getBoundingClientRect()
      return {
        x: pos.x + rect.width > innerWidth ? innerWidth - rect.width - 4 : pos.x,
        y: pos.y + rect.height > innerHeight ? innerHeight - rect.height - 4 : pos.y
      }
    },
    []
  )

  useEffect(() => {
    if (!position) return

    const handleClickOutside = (e: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const handleEscape = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    const handleScroll = (): void => onClose()

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [position, onClose])

  // Clamp after first render
  useEffect(() => {
    if (!position || !menuRef.current) return
    const clamped = clampPosition(position)
    const menu = menuRef.current
    menu.style.left = `${clamped.x}px`
    menu.style.top = `${clamped.y}px`
  }, [position, clampPosition])

  return (
    <AnimatePresence>
      {position && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="fixed z-50 min-w-[180px] rounded-md border border-border bg-popup-bg py-1 shadow-xl"
          style={{ left: position.x, top: position.y }}
        >
          {entries.map((entry, i) =>
            entry.type === 'separator' ? (
              <div key={i} className="my-1 border-t border-border" />
            ) : entry.type === 'colors' ? (
              <div key={i} className="flex justify-between px-3 py-2.5">
                {entry.colors.map((c) => (
                  <button
                    key={c.id}
                    title={c.label}
                    onClick={() => {
                      entry.onSelect(entry.activeColor === c.id ? null : c.id)
                      onClose()
                    }}
                    className={`h-5 w-5 rounded-full ${COLOR_BG_CLASSES[c.id] ?? ''} ${entry.activeColor === c.id ? 'ring-2 ring-fg ring-offset-1 ring-offset-popup-bg' : ''}`}
                  />
                ))}
              </div>
            ) : (
              <button
                key={i}
                disabled={entry.disabled}
                onClick={() => {
                  entry.onAction()
                  onClose()
                }}
                className="flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-sm text-fg hover:bg-surface-hover disabled:pointer-events-none disabled:opacity-40"
              >
                <span>{entry.label}</span>
                {entry.shortcut && <Kbd>{entry.shortcut}</Kbd>}
              </button>
            )
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
