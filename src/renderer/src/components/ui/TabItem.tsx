import { useState, useRef, useEffect, useCallback } from 'react'

interface TabItemProps {
  title: string
  isActive: boolean
  canClose: boolean
  onClick: () => void
  onClose: () => void
  onRename: (newTitle: string) => void
}

export function TabItem({ title, isActive, canClose, onClick, onClose, onRename }: TabItemProps): JSX.Element {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== title) {
      onRename(trimmed)
    } else {
      setDraft(title)
    }
    setEditing(false)
  }, [draft, title, onRename])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        commit()
      } else if (e.key === 'Escape') {
        setDraft(title)
        setEditing(false)
      }
    },
    [commit, title]
  )

  return (
    <div
      onClick={onClick}
      onDoubleClick={() => {
        setDraft(title)
        setEditing(true)
      }}
      className={`flex select-none items-center gap-2.5 whitespace-nowrap px-6 py-2.5 text-base transition-all ${
        isActive
          ? 'border-b-2 border-accent bg-elevated text-fg'
          : 'border-b-2 border-transparent text-fg-muted'
      }`}
    >
      <span
        className={`text-sm text-accent ${isActive ? 'opacity-100' : 'opacity-40'}`}
      >
        ›_
      </span>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="w-24 border-none bg-transparent text-sm text-fg outline-none focus-visible:outline-none"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        title
      )}
      {canClose && !editing && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="ml-1 cursor-pointer text-base leading-none opacity-40 hover:opacity-70"
        >
          ×
        </span>
      )}
    </div>
  )
}
