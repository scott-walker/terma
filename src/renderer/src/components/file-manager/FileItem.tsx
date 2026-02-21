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
      className="flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-2 text-xs text-[#a9b1d6] hover:bg-[#1a1b26]"
      style={{ paddingLeft: `${depth * 16 + 8}px` }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {isDirectory ? (
        <span className="w-3 shrink-0 text-[#565f89]">
          {isExpanded ? (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M3 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 12 12">
              <path d="M4 3l3 3-3 3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </svg>
          )}
        </span>
      ) : (
        <span className="w-3 shrink-0" />
      )}
      <span className={isDirectory ? 'text-[#7aa2f7]' : 'text-[#a9b1d6]'}>
        {isDirectory ? (
          <svg width="14" height="14" viewBox="0 0 14 14" className="inline-block">
            <path
              d="M1 3.5C1 2.67 1.67 2 2.5 2h3l1.5 1.5h4.5c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-9C1.67 11.5 1 10.83 1 10V3.5z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" className="inline-block">
            <path
              d="M3 1h5l3 3v8c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path d="M8 1v3h3" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        )}
      </span>
      <span className="truncate">{name}</span>
    </div>
  )
}
