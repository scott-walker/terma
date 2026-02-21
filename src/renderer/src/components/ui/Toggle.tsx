import { motion } from 'framer-motion'

interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
}

export function Toggle({ checked, onChange }: ToggleProps): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked ? 'bg-accent' : 'bg-border'
      }`}
    >
      <motion.div
        className="absolute top-1 h-5 w-5 rounded-full bg-fg shadow-md"
        animate={{ left: checked ? 26 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}
