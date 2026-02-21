export function FolderIcon({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" className="inline-block">
      <path
        d="M1 3.5C1 2.67 1.67 2 2.5 2h3l1.5 1.5h4.5c.83 0 1.5.67 1.5 1.5v5c0 .83-.67 1.5-1.5 1.5h-9C1.67 11.5 1 10.83 1 10V3.5z"
        fill="currentColor"
      />
    </svg>
  )
}
