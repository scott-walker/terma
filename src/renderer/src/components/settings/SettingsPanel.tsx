import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Palette,
  Type,
  Monitor,
  RotateCcw,
  Minus,
  Plus,
  ZoomIn,
  ScrollText
} from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'
import { PRESET_THEMES } from '@shared/themes'

function Section({
  icon: Icon,
  title,
  children
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 text-[#565f89]">
        <Icon size={14} strokeWidth={2} />
        <span className="text-[11px] font-semibold uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  )
}

function ThemeCard({
  name,
  colors,
  active,
  onClick
}: {
  name: string
  colors: Record<string, string | undefined>
  active: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative flex flex-col gap-2.5 rounded-xl border p-3.5 text-left transition-colors ${
        active
          ? 'border-[#7aa2f7] bg-[#7aa2f7]/8 shadow-[0_0_20px_rgba(122,162,247,0.1)]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
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
            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#7aa2f7]"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5L4.5 7.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
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

function SegmentedControl({
  value,
  options,
  onChange
}: {
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}): JSX.Element {
  return (
    <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-all ${
            value === opt.value
              ? 'bg-white/[0.1] text-[#c0caf5] shadow-sm'
              : 'text-[#565f89] hover:text-[#a9b1d6]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange
}: {
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 rounded-full transition-colors ${
        checked ? 'bg-[#7aa2f7]' : 'bg-white/[0.1]'
      }`}
    >
      <motion.div
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow-md"
        animate={{ left: checked ? 26 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  )
}

function NumberStepper({
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  suffix?: string
}): JSX.Element {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1.5">
      <button
        onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
        {step < 1 ? value.toFixed(1) : value}{suffix}
      </span>
      <button
        onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export function SettingsPanel(): JSX.Element {
  const { settings, updateSettings, resetSettings, zoomIn, zoomOut, zoomReset, toggleSettings } =
    useSettingsStore()
  const effectiveFontSize = useSettingsStore((s) => s.getEffectiveFontSize())

  useEffect(() => {
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') toggleSettings()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [toggleSettings])

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex justify-end" onClick={toggleSettings}>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-full w-[440px] flex-col border-l border-white/[0.06] bg-[#0f0f17]/95 shadow-[-8px_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-7 pb-2">
            <div>
              <h2 className="text-lg font-semibold text-[#c0caf5]">Settings</h2>
              <p className="mt-1 text-xs text-[#565f89]">Customize your terminal</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={toggleSettings}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#565f89] transition-colors hover:bg-white/[0.06] hover:text-[#c0caf5]"
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-8 overflow-y-auto px-7 py-6">
            {/* Themes */}
            <Section icon={Palette} title="Theme">
              <div className="grid grid-cols-2 gap-3">
                {PRESET_THEMES.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    name={theme.name}
                    colors={theme.colors as unknown as Record<string, string>}
                    active={settings.activeThemeId === theme.id}
                    onClick={() => updateSettings({ activeThemeId: theme.id })}
                  />
                ))}
              </div>
            </Section>

            <div className="h-px bg-white/[0.06]" />

            {/* Font */}
            <Section icon={Type} title="Font">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs text-[#565f89]">Family</label>
                  <input
                    type="text"
                    value={settings.fontFamily}
                    onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.04] px-4 py-2.5 text-sm text-[#c0caf5] outline-none transition-colors placeholder:text-[#414868] focus:border-[#7aa2f7]/50 focus:bg-white/[0.06]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-2 block text-xs text-[#565f89]">Size</label>
                    <NumberStepper
                      value={settings.fontSize}
                      min={8}
                      max={32}
                      onChange={(v) => updateSettings({ fontSize: v })}
                      suffix="px"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs text-[#565f89]">Line Height</label>
                    <NumberStepper
                      value={settings.lineHeight}
                      min={1}
                      max={2}
                      step={0.1}
                      onChange={(v) => updateSettings({ lineHeight: v })}
                    />
                  </div>
                </div>
              </div>
            </Section>

            <div className="h-px bg-white/[0.06]" />

            {/* Zoom */}
            <Section icon={ZoomIn} title="Zoom">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-4">
                <div>
                  <div className="text-base font-medium">{effectiveFontSize}px</div>
                  <div className="mt-0.5 text-[11px] text-[#565f89]">
                    {settings.fontSize}px base {settings.zoomLevel >= 0 ? '+' : ''}{settings.zoomLevel} zoom
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={zoomOut}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
                  >
                    <Minus size={16} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={zoomReset}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
                  >
                    0
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={zoomIn}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>
              </div>
            </Section>

            <div className="h-px bg-white/[0.06]" />

            {/* Cursor */}
            <Section icon={Monitor} title="Cursor">
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs text-[#565f89]">Style</label>
                  <SegmentedControl
                    value={settings.cursorStyle}
                    options={[
                      { value: 'bar', label: 'Bar' },
                      { value: 'block', label: 'Block' },
                      { value: 'underline', label: 'Underline' }
                    ]}
                    onChange={(v) => updateSettings({ cursorStyle: v as 'bar' | 'block' | 'underline' })}
                  />
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-4 py-3.5">
                  <span className="text-sm">Cursor Blink</span>
                  <Toggle
                    checked={settings.cursorBlink}
                    onChange={(v) => updateSettings({ cursorBlink: v })}
                  />
                </div>
              </div>
            </Section>

            <div className="h-px bg-white/[0.06]" />

            {/* Scrollback */}
            <Section icon={ScrollText} title="Buffer">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-4">
                <div>
                  <div className="text-sm font-medium">{settings.scrollback.toLocaleString()} lines</div>
                  <div className="mt-0.5 text-[11px] text-[#565f89]">Scrollback buffer</div>
                </div>
                <NumberStepper
                  value={settings.scrollback}
                  min={1000}
                  max={100000}
                  step={1000}
                  onChange={(v) => updateSettings({ scrollback: v })}
                />
              </div>
            </Section>

            {/* Reset */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={resetSettings}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-sm text-[#565f89] transition-colors hover:border-[#f7768e]/20 hover:bg-[#f7768e]/5 hover:text-[#f7768e]"
              >
                <RotateCcw size={14} />
                Reset to Defaults
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
