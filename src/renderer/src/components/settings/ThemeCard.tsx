import { motion } from 'framer-motion'
import { CheckIcon } from '../ui/icons/CheckIcon'

interface ThemeCardProps {
  name: string
  colors: Record<string, string | undefined>
  active: boolean
  onClick: () => void
}

export function ThemeCard({ name, colors, active, onClick }: ThemeCardProps): JSX.Element {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative flex flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-colors ${
        active
          ? 'border-fg/40 bg-fg/8 shadow-[--shadow-accent-glow]'
          : 'border-border bg-surface hover:border-border-hover hover:bg-surface-hover'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-lg shadow-inner"
          style={{ background: colors.background }}
        >
          <div className="flex h-full items-center justify-center gap-[3px]">
            {[colors.red, colors.green, colors.blue, colors.yellow].map((c, i) => (
              <div
                key={i}
                className="h-3 w-[3px] rounded-full"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-medium" style={{ color: colors.foreground }}>
            {name}
          </div>
        </div>
        {active && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex h-5 w-5 items-center justify-center rounded-full bg-fg text-base"
          >
            <CheckIcon />
          </motion.div>
        )}
      </div>
      <div className="flex gap-1">
        {[
          colors.red, colors.green, colors.yellow,
          colors.blue, colors.magenta, colors.cyan
        ].map((c, i) => (
          <div
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: c }}
          />
        ))}
      </div>
    </motion.button>
  )
}
