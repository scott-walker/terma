export function ChevronDown({ size = 12 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12">
      <path d="M3 4l3 3 3-3" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
