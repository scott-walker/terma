import { ChevronDown } from '../ui/icons/ChevronDown'
import { ChevronRight } from '../ui/icons/ChevronRight'
import { FolderIcon } from '../ui/icons/FolderIcon'
import { FileIcon } from '../ui/icons/FileIcon'

interface FileItemProps {
  name: string
  path: string
  isDirectory: boolean
  isExpanded: boolean
  depth: number
  onClick: () => void
  onDoubleClick: () => void
}

export function FileItem({
  name,
  isDirectory,
  isExpanded,
  depth,
  onClick,
  onDoubleClick
}: FileItemProps): JSX.Element {
  return (
    <div
      className="flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs text-fg-secondary hover:bg-surface"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {isDirectory ? (
        <span className="w-3 shrink-0 text-fg-muted">
          {isExpanded ? <ChevronDown /> : <ChevronRight />}
        </span>
      ) : (
        <span className="w-3 shrink-0" />
      )}
      <span className={isDirectory ? 'text-info' : 'text-fg-secondary'}>
        {isDirectory ? <FolderIcon /> : <FileIcon />}
      </span>
      <span className="truncate">{name}</span>
    </div>
  )
}
