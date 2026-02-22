import { useState, useRef, useEffect, useCallback } from 'react'

const TAB_COLOR_CLASSES: Record<string, { border: string; bg: string }> = {
  red: { border: 'border-tab-red', bg: 'bg-tab-red' },
  orange: { border: 'border-tab-orange', bg: 'bg-tab-orange' },
  yellow: { border: 'border-tab-yellow', bg: 'bg-tab-yellow' },
  green: { border: 'border-tab-green', bg: 'bg-tab-green' },
  blue: { border: 'border-tab-blue', bg: 'bg-tab-blue' },
  purple: { border: 'border-tab-purple', bg: 'bg-tab-purple' }
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
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  useEffect(() => {
    if (forceEdit) {
      setDraft(title)
      setEditing(true)
    }
  }, [forceEdit, title])

  const stopEditing = useCallback(() => {
    setEditing(false)
    onEditEnd?.()
  }, [onEditEnd])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) {
      onRename(trimmed)
    } else {
      setDraft(title)
    }
    stopEditing()
  }, [draft, title, onRename, stopEditing])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commit()
      } else if (e.key === 'Escape') {
        setDraft(title)
        stopEditing()
      }
    },
    [commit, title, stopEditing]
  )

  const effectiveColor = TAB_COLOR_CLASSES[color ?? 'green']

  const borderClass = isActive ? effectiveColor.border : 'border-transparent'

  const dotClass = `${effectiveColor.bg} ${isActive ? 'opacity-100' : 'opacity-50'}`

  const textClass = isActive ? 'text-fg' : 'text-fg-muted'

  return (
    <div
      draggable={!editing}
      onClick={onClick}
      onDoubleClick={() => {
        setDraft(title)
        setEditing(true)
      }}
      onContextMenu={onContextMenu}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`relative flex select-none items-center gap-2.5 whitespace-nowrap border-b-2 px-6 py-2.5 text-base transition-all ${borderClass} ${isActive ? 'bg-elevated' : ''} ${textClass} ${dropSide === 'left' ? 'before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-accent' : ''} ${dropSide === 'right' ? 'after:absolute after:inset-y-1 after:right-0 after:w-0.5 after:rounded-full after:bg-accent' : ''}`}
    >
      <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotClass}`} />
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          size={Math.max(draft.length, 1)}
          className="min-w-0 border-none bg-transparent text-fg outline-none focus-visible:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        title
      )}
      {canClose && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className={`ml-1 cursor-pointer text-base leading-none opacity-40 hover:opacity-70 ${editing ? 'invisible' : ''}`}
        >
          ×
        </span>
      )}
    </div>
  )
}
