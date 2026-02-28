import { useState, useEffect, useCallback } from 'react'

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  delay?: number
}

export function Input({ value, onChange, delay = 400, className = '', ...rest }: InputProps): JSX.Element {
  const [local, setLocal] = useState(value)

  useEffect(() => { setLocal(value) }, [value])

  const stableOnChange = useCallback(onChange, [onChange])

  useEffect(() => {
    if (local === value) return
    const t = setTimeout(() => stableOnChange(local), delay)
    return () => clearTimeout(t)
  }, [local, value, stableOnChange, delay])

  return (
    <input
      type="text"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      className={`w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-fg-muted focus:border-accent/40 focus:bg-surface-hover ${className}`}
      {...rest}
    />
  )
}
