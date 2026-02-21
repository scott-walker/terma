export function CheckIcon({ size = 10 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill="none">
      <path d="M2 5L4.5 7.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
