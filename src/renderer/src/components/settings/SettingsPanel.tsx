import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Palette,
  Type,
  Monitor,
  RotateCcw,
  ZoomIn,
  Minus,
  Plus,
  ScrollText,
  Settings2,
  Paintbrush,
  FileCode2
} from 'lucide-react'
import type { FileAssociation } from '@shared/settings'
import { useSettingsStore } from '@/stores/settings-store'
import { PRESET_THEMES } from '@shared/themes'
import { Section } from '../ui/Section'
import { Toggle } from '../ui/Toggle'
import { NumberStepper } from '../ui/NumberStepper'
import { SegmentedControl } from '../ui/SegmentedControl'
import { Input } from '../ui/Input'
import { Divider } from '../ui/Divider'
import { ThemeCard } from './ThemeCard'

type SettingsTab = 'general' | 'style'

const TABS: { id: SettingsTab; label: string; icon: typeof Settings2 }[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'style', label: 'Style', icon: Paintbrush }
]

export function SettingsPanel(): JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
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
          className="absolute inset-0 bg-backdrop backdrop-blur-sm"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-full w-[440px] flex-col border-l border-border bg-base/98 shadow-panel backdrop-blur-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-7 pb-2">
            <div>
              <h2 className="text-lg font-semibold text-fg">Settings</h2>
              <p className="mt-1 text-xs text-fg-muted">Customize your terminal</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              onClick={toggleSettings}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-fg-muted transition-colors hover:bg-surface hover:text-fg"
            >
              <X size={16} />
            </motion.button>
          </div>

          {/* Tab navigation */}
          <div className="flex gap-1 px-7 pt-4 pb-2">
            {TABS.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border border-transparent bg-transparent px-3.5 py-2 text-sm transition-colors ${
                    isActive
                      ? 'border-border bg-surface text-fg'
                      : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-8 overflow-y-auto px-7 py-6">
            {activeTab === 'general' && (
              <>
                {/* Cursor */}
                <Section icon={Monitor} title="Cursor">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs text-fg-muted">Style</label>
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
                    <div className="flex items-center justify-between rounded-xl bg-surface px-4 py-3.5">
                      <span className="text-sm text-fg-secondary">Cursor Blink</span>
                      <Toggle
                        checked={settings.cursorBlink}
                        onChange={(v) => updateSettings({ cursorBlink: v })}
                      />
                    </div>
                  </div>
                </Section>

                <Divider />

                {/* Scrollback */}
                <Section icon={ScrollText} title="Buffer">
                  <div className="flex items-center justify-between rounded-xl bg-surface p-4">
                    <div>
                      <div className="text-sm font-medium text-fg">{settings.scrollback.toLocaleString()} lines</div>
                      <div className="mt-0.5 text-[11px] text-fg-muted">Scrollback buffer</div>
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

                <Divider />

                {/* File Associations */}
                <Section icon={FileCode2} title="File Associations">
                  <div className="space-y-2">
                    {(settings.fileAssociations ?? []).map((assoc: FileAssociation, i: number) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input
                          value={assoc.pattern}
                          placeholder="*.txt"
                          onChange={(e) => {
                            const next = [...settings.fileAssociations]
                            next[i] = { ...next[i], pattern: e.target.value }
                            updateSettings({ fileAssociations: next })
                          }}
                          className="flex-1"
                        />
                        <Input
                          value={assoc.command}
                          placeholder="code"
                          onChange={(e) => {
                            const next = [...settings.fileAssociations]
                            next[i] = { ...next[i], command: e.target.value }
                            updateSettings({ fileAssociations: next })
                          }}
                          className="flex-1"
                        />
                        <button
                          onClick={() => {
                            const next = settings.fileAssociations.filter((_, j) => j !== i)
                            updateSettings({ fileAssociations: next })
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-danger"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => {
                        const next = [...(settings.fileAssociations ?? []), { pattern: '', command: '' }]
                        updateSettings({ fileAssociations: next })
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent px-4 py-2.5 text-sm text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </Section>

                {/* Reset */}
                <div className="pt-2">
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={resetSettings}
                    className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-3.5 text-sm text-fg-muted transition-colors hover:border-danger/30 hover:bg-danger/8 hover:text-danger"
                  >
                    <RotateCcw size={14} />
                    Reset to Defaults
                  </motion.button>
                </div>
              </>
            )}

            {activeTab === 'style' && (
              <>
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

                <Divider />

                {/* Font */}
                <Section icon={Type} title="Font">
                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-xs text-fg-muted">Family</label>
                      <Input
                        value={settings.fontFamily}
                        onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-2 block text-xs text-fg-muted">Size</label>
                        <NumberStepper
                          value={settings.fontSize}
                          min={8}
                          max={32}
                          onChange={(v) => updateSettings({ fontSize: v })}
                          suffix="px"
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-xs text-fg-muted">Line Height</label>
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

                <Divider />

                {/* Zoom */}
                <Section icon={ZoomIn} title="Zoom">
                  <div className="flex items-center justify-between rounded-xl bg-surface p-4">
                    <div>
                      <div className="text-base font-medium text-fg">{effectiveFontSize}px</div>
                      <div className="mt-0.5 text-[11px] text-fg-muted">
                        {settings.fontSize}px base {settings.zoomLevel >= 0 ? '+' : ''}{settings.zoomLevel} zoom
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={zoomOut}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                      >
                        <Minus size={16} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={zoomReset}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                      >
                        0
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={zoomIn}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                      >
                        <Plus size={16} />
                      </motion.button>
                    </div>
                  </div>
                </Section>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
