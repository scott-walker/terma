import { Minus, Plus } from 'lucide-react'

interface NumberStepperProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  suffix?: string
}

export function NumberStepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix
}: NumberStepperProps): JSX.Element {
  const decimals = step < 1 ? Math.max(1, -Math.floor(Math.log10(step))) : 0
  return (
    <div className="flex items-center gap-1 rounded-xl bg-surface p-1.5">
      <button
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(decimals)))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <Minus size={14} />
      </button>
      <span className="flex-1 text-center text-sm font-medium tabular-nums text-fg">
        {decimals > 0 ? value.toFixed(decimals) : value}{suffix}
      </span>
      <button
        onClick={() => onChange(Math.min(max, +(value + step).toFixed(decimals)))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
