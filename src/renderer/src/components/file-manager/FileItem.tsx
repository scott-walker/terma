import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { ChevronRight } from 'lucide-react'
import { FileTypeIcon } from './FileTypeIcon'

interface FileItemProps {
  name: string
  path: string
  isDirectory: boolean
  isExpanded: boolean
  isSelected: boolean
  isRenaming: boolean
  depth: number
  fontSize: number
  rowHeight: number
  style?: React.CSSProperties
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onDragStart: (e: React.DragEvent) => void
  onRenameSubmit: (newName: string) => void
  onRenameCancel: () => void
}

export const FileItem = memo(function FileItem({
  name,
  isDirectory,
  isExpanded,
  isSelected,
  isRenaming,
  depth,
  fontSize,
  rowHeight,
  style,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onRenameSubmit,
  onRenameCancel
}: FileItemProps): JSX.Element {
  const indent = Math.round(fontSize * 0.6)
  const iconSize = Math.round(fontSize * 1.15)
  const chevronSize = Math.round(fontSize * 0.85)

  const [editValue, setEditValue] = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming) {
      setEditValue(name)
      requestAnimationFrame(() => {
        const input = inputRef.current
        if (!input) return
        input.focus()
        // Select name without extension for files, full name for directories
        const dotIdx = isDirectory ? -1 : name.lastIndexOf('.')
        input.setSelectionRange(0, dotIdx > 0 ? dotIdx : name.length)
      })
    }
  }, [isRenaming, name, isDirectory])

  const submitRename = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== name) {
      onRenameSubmit(trimmed)
    } else {
      onRenameCancel()
    }
  }, [editValue, name, onRenameSubmit, onRenameCancel])

  return (
    <div
      className={`relative flex w-full cursor-default items-center pr-2 hover:bg-surface-hover ${
        isSelected ? 'bg-overlay-subtle' : ''
      }`}
      style={{
        height: rowHeight,
        fontSize,
        lineHeight: `${rowHeight}px`,
        paddingLeft: depth * indent,
        ...style
      }}
      draggable={name !== '..' && !isRenaming}
      onClick={isRenaming ? undefined : onClick}
      onDoubleClick={isRenaming ? undefined : onDoubleClick}
      onContextMenu={isRenaming ? undefined : onContextMenu}
      onDragStart={isRenaming ? undefined : onDragStart}
    >
      {/* Indent guides */}
      {depth > 0 &&
        Array.from({ length: depth }, (_, i) => (
          <span
            key={i}
            className="pointer-events-none absolute top-0 bottom-0 w-px bg-border opacity-40"
            style={{ left: i * indent + Math.round(indent * 1.5) }}
          />
        ))}

      {/* Chevron */}
      <span
        className="flex shrink-0 items-center justify-center"
        style={{ width: fontSize + 2 }}
      >
        {isDirectory && (
          <ChevronRight
            size={chevronSize}
            className="text-fg-muted transition-transform duration-150"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
        )}
      </span>

      {/* Icon */}
      <span className="mr-1.5 flex shrink-0 items-center">
        <FileTypeIcon name={name} isDirectory={isDirectory} isExpanded={isExpanded} size={iconSize} />
      </span>

      {/* Filename or rename input */}
      {isRenaming ? (
        <input
          ref={inputRef}
          className="min-w-0 flex-1 rounded-sm border border-accent bg-surface px-1 text-fg outline-none"
          style={{ fontSize, lineHeight: `${rowHeight - 4}px`, height: rowHeight - 4 }}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            e.stopPropagation()
            if (e.key === 'Enter') {
              e.preventDefault()
              submitRename()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onRenameCancel()
            }
          }}
          onBlur={submitRename}
        />
      ) : (
        <span className={`truncate ${isSelected ? 'text-file-selected' : 'text-fg'}`}>{name}</span>
      )}
    </div>
  )
})
