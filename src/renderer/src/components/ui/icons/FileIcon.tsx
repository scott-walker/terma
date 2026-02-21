export function FileIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className="inline-block">
      <path
        d="M3 1h5l3 3v8c0 .55-.45 1-1 1H3c-.55 0-1-.45-1-1V2c0-.55.45-1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path d="M8 1v3h3" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}
