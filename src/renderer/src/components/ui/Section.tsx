interface SectionProps {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}

export function Section({ icon: Icon, title, children }: SectionProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 text-fg-muted">
        <Icon size={14} strokeWidth={2} />
        <span className="text-[11px] font-semibold uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  )
}
