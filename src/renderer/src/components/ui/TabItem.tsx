import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

export const DEFAULT_TAB_COLOR = 'gray'

const TAB_COLOR_CLASSES: Record<string, { border: string; bg: string }> = {
  red: { border: 'border-tab-red', bg: 'bg-tab-red' },
  orange: { border: 'border-tab-orange', bg: 'bg-tab-orange' },
  yellow: { border: 'border-tab-yellow', bg: 'bg-tab-yellow' },
  green: { border: 'border-tab-green', bg: 'bg-tab-green' },
  blue: { border: 'border-tab-blue', bg: 'bg-tab-blue' },
  purple: { border: 'border-tab-purple', bg: 'bg-tab-purple' },
  pink: { border: 'border-tab-pink', bg: 'bg-tab-pink' },
  gray: { border: 'border-tab-gray', bg: 'bg-tab-gray' }
}

interface TabItemProps {
  title: string
  isActive: boolean
  canClose: boolean
  color?: string | null
  forceEdit?: boolean
  onClick: () => void
  onClose: () => void
  onRename: (newTitle: string) => void
  onEditEnd?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  dropSide: 'left' | 'right' | null
}

export function TabItem({ title, isActive, canClose, color, forceEdit, onClick, onClose, onRename, onEditEnd, onContextMenu, onDragStart, onDragOver, onDrop, onDragEnd, dropSide }: TabItemProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const spanRef = useRef<HTMLSpanElement>(null)

  const selectAll = useCallback(() => {
    const el = spanRef.current
    if (!el) return
    const range = document.createRange()
    range.selectNodeContents(el)
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(range)
  }, [])

  const startEditing = useCallback(() => {
    setEditing(true)
  }, [])

  useEffect(() => {
    if (editing && spanRef.current) {
      spanRef.current.focus()
      selectAll()
    }
  }, [editing, selectAll])

  useEffect(() => {
    if (forceEdit) {
      startEditing()
    }
  }, [forceEdit, startEditing])

  const stopEditing = useCallback(() => {
    setEditing(false)
    onEditEnd?.()
  }, [onEditEnd])

  const commit = useCallback(() => {
    const trimmed = spanRef.current?.textContent?.trim() ?? ''
    if (trimmed && trimmed !== title) {
      onRename(trimmed)
    } else if (spanRef.current) {
      spanRef.current.textContent = title
    }
    stopEditing()
  }, [title, onRename, stopEditing])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commit()
      } else if (e.key === 'Escape') {
        if (spanRef.current) {
          spanRef.current.textContent = title
        }
        stopEditing()
      }
    },
    [commit, title, stopEditing]
  )

  const effectiveColor = TAB_COLOR_CLASSES[color ?? DEFAULT_TAB_COLOR]

  const borderClass = isActive ? effectiveColor.border : 'border-transparent'

  const dotClass = `${effectiveColor.bg} ${isActive ? 'opacity-100' : 'opacity-50'}`

  const textClass = isActive ? 'text-fg' : 'text-fg-muted'

  return (
    <div
      draggable={!editing}
      onClick={onClick}
      onDoubleClick={startEditing}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`group relative flex select-none items-center gap-2.5 whitespace-nowrap border-b-2 pl-6 pr-3 py-2.5 text-base transition-colors hover:bg-fg/5 ${borderClass} ${isActive ? 'bg-tab-active-bg' : ''} ${textClass} ${dropSide ? 'bg-tab-drop-indicator/10' : ''} ${dropSide === 'left' ? 'before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-tab-drop-indicator' : ''} ${dropSide === 'right' ? 'after:absolute after:inset-y-0 after:right-0 after:w-1 after:bg-tab-drop-indicator' : ''}`}
    >
      <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
      <span
        ref={spanRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onBlur={editing ? commit : undefined}
        onKeyDown={editing ? handleKeyDown : undefined}
        onClick={editing ? (e) => e.stopPropagation() : undefined}
        spellCheck={false}
        className={editing ? 'outline-none' : undefined}
      >
        {title}
      </span>
      {canClose && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="ml-1 shrink-0 rounded p-0.5 opacity-0 transition-opacity hover:bg-fg/10 group-hover:opacity-100 aria-[current]:opacity-100"
          aria-current={isActive ? 'true' : undefined}

        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
