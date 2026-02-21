interface SegmentedControlProps {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}

export function SegmentedControl({
  value,
  options,
  onChange
}: SegmentedControlProps): JSX.Element {
  return (
    <div className="flex gap-1 rounded-xl bg-surface p-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
            value === opt.value
              ? 'bg-surface-hover text-fg shadow-sm'
              : 'text-fg-muted hover:text-fg-secondary'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
