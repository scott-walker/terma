interface InputProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  className?: string
}

export function Input({ value, onChange, placeholder, className = '' }: InputProps): JSX.Element {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-muted focus:border-accent/40 focus:bg-surface-hover ${className}`}
    />
  )
}
