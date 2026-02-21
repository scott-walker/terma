export function Kbd({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <span className="rounded bg-base px-1.5 py-0.5 text-[10px] text-fg-muted">
      {children}
    </span>
  )
}
