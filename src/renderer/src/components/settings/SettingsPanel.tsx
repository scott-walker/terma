import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Palette,
  Type,
  Monitor,
  RotateCcw,
  Minus,
  Plus,
  ZoomIn
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
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[#565f89]">
        <Icon size={14} strokeWidth={2} />
        <span className="text-[11px] font-semibold uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  )
}

function ThemeCard({
  id,
  name,
  colors,
  active,
  onClick
}: {
  id: string
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
      className={`group relative flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
        active
          ? 'border-[#7aa2f7] bg-[#7aa2f7]/8 shadow-[0_0_20px_rgba(122,162,247,0.1)]'
          : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div
          className="h-8 w-8 rounded-lg shadow-inner"
          style={{ background: colors.background }}
        >
          <div className="flex h-full items-center justify-center gap-[2px]">
            {[colors.red, colors.green, colors.blue, colors.yellow].map((c, i) => (
              <div
                key={i}
                className="h-2.5 w-[3px] rounded-full"
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
      {/* Color palette preview */}
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
    <div className="flex gap-1 rounded-lg bg-white/[0.04] p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`relative flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
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
      className={`relative h-6 w-11 rounded-full transition-colors ${
        checked ? 'bg-[#7aa2f7]' : 'bg-white/[0.1]'
      }`}
    >
      <motion.div
        className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-md"
        animate={{ left: checked ? 24 : 4 }}
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
    <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] p-1">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[3rem] text-center text-sm font-medium tabular-nums">
        {step < 1 ? value.toFixed(1) : value}{suffix}
      </span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="flex h-7 w-7 items-center justify-center rounded-md text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
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
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
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
          ref={panelRef}
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-full w-[420px] flex-col border-l border-white/[0.06] bg-[#0f0f17]/95 shadow-[-8px_0_40px_rgba(0,0,0,0.5)] backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-[#c0caf5]">Settings</h2>
              <p className="mt-0.5 text-xs text-[#565f89]">Customize your terminal</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={toggleSettings}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[#565f89] transition-colors hover:bg-white/[0.06] hover:text-[#c0caf5]"
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6 overflow-y-auto px-6 pb-6">
            {/* Themes */}
            <Section icon={Palette} title="Theme">
              <div className="grid grid-cols-2 gap-2">
                {PRESET_THEMES.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    id={theme.id}
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
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#565f89]">Family</label>
                  <input
                    type="text"
                    value={settings.fontFamily}
                    onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                    className="w-full rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 py-2 text-sm text-[#c0caf5] outline-none transition-colors placeholder:text-[#414868] focus:border-[#7aa2f7]/50 focus:bg-white/[0.06]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs text-[#565f89]">Size</label>
                    <NumberStepper
                      value={settings.fontSize}
                      min={8}
                      max={32}
                      onChange={(v) => updateSettings({ fontSize: v })}
                      suffix="px"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs text-[#565f89]">Line Height</label>
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
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                <div>
                  <div className="text-sm font-medium">{effectiveFontSize}px</div>
                  <div className="text-[11px] text-[#565f89]">
                    {settings.fontSize}px base {settings.zoomLevel >= 0 ? '+' : ''}{settings.zoomLevel} zoom
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={zoomOut}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
                  >
                    <Minus size={16} />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={zoomReset}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
                  >
                    0
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={zoomIn}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#565f89] transition-colors hover:bg-white/[0.08] hover:text-[#c0caf5]"
                  >
                    <Plus size={16} />
                  </motion.button>
                </div>
              </div>
            </Section>

            <div className="h-px bg-white/[0.06]" />

            {/* Cursor */}
            <Section icon={Monitor} title="Cursor">
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs text-[#565f89]">Style</label>
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
                <div className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
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
            <Section icon={Monitor} title="Buffer">
              <div className="flex items-center justify-between rounded-xl bg-white/[0.03] p-3">
                <div>
                  <div className="text-sm font-medium">{settings.scrollback.toLocaleString()} lines</div>
                  <div className="text-[11px] text-[#565f89]">Scrollback buffer</div>
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
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={resetSettings}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm text-[#565f89] transition-colors hover:border-[#f7768e]/20 hover:bg-[#f7768e]/5 hover:text-[#f7768e]"
            >
              <RotateCcw size={14} />
              Reset to Defaults
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
