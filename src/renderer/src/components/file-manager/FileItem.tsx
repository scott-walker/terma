import { ChevronRight } from 'lucide-react'
import { FileTypeIcon } from './FileTypeIcon'

interface FileItemProps {
  name: string
  path: string
  isDirectory: boolean
  isExpanded: boolean
  isSelected: boolean
  depth: number
  fontSize: number
  rowHeight: number
  style?: React.CSSProperties
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
}

export function FileItem({
  name,
  isDirectory,
  isExpanded,
  isSelected,
  depth,
  fontSize,
  rowHeight,
  style,
  onClick,
  onDoubleClick,
  onContextMenu
}: FileItemProps): JSX.Element {
  const indent = Math.round(fontSize * 0.6)
  const iconSize = Math.round(fontSize * 1.15)
  const chevronSize = Math.round(fontSize * 0.85)

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
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
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

      {/* Filename */}
      <span className={`truncate ${isSelected ? 'text-warning' : 'text-fg'}`}>{name}</span>
    </div>
  )
}
