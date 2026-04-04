import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Palette,
  Type,
  Monitor,
  RotateCcw,
  ZoomIn,
  Plus,
  ScrollText,
  Settings2,
  Paintbrush,
  FileCode2,
  Eye,
  EyeOff,
  KeyRound,
  ChevronDown,
  Check,
  AudioLines,
  Code2,
  Globe
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

const FONT_PRESETS = [
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'Cascadia Code', value: "'Cascadia Code', monospace" },
  { label: 'Fira Code', value: "'Fira Code', monospace" },
  { label: 'Source Code Pro', value: "'Source Code Pro', monospace" },
  { label: 'IBM Plex Mono', value: "'IBM Plex Mono', monospace" },
  { label: 'Inconsolata', value: "'Inconsolata', monospace" },
  { label: 'Ubuntu Mono', value: "'Ubuntu Mono', monospace" }
]

function FontFamilyDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activePreset = FONT_PRESETS.find((f) => f.value === value)
  const displayLabel = activePreset?.label ?? value

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  return (
    <div>
      <label className="mb-2 block text-xs text-fg-muted">Family</label>
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-fg outline-none transition-colors hover:bg-surface-hover"
          style={{ fontFamily: value }}
        >
          <span>{displayLabel}</span>
          <ChevronDown size={14} className={`text-fg-muted transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-border bg-popup-bg py-1 shadow-xl"
            >
              {FONT_PRESETS.map((f) => {
                const isActive = f.value === value
                return (
                  <button
                    key={f.label}
                    onClick={() => { onChange(f.value); setOpen(false) }}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${isActive ? 'bg-surface-hover text-white' : 'text-fg hover:bg-surface-hover'}`}
                    style={{ fontFamily: f.value }}
                  >
                    <span className="flex-1">{f.label}</span>
                    {isActive && <Check size={14} />}
                  </button>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

type SettingsTab = 'general' | 'style'

const TABS: { id: SettingsTab; label: string; icon: typeof Settings2 }[] = [
  { id: 'general', label: 'General', icon: Settings2 },
  { id: 'style', label: 'Style', icon: Paintbrush }
]

function IdeSection(): JSX.Element {
  const { settings, updateSettings } = useSettingsStore()

  return (
    <Section icon={Code2} title="IDE">
      <div>
        <label className="mb-2 block text-xs text-fg-muted">IDE Executable</label>
        <Input
          value={settings.idePath}
          onChange={(v) => updateSettings({ idePath: v })}
          placeholder="code, cursor, /usr/bin/code"
        />
        <p className="mt-2 text-[11px] text-fg-muted">
          Command or path to IDE executable
        </p>
      </div>
    </Section>
  )
}

function OpenAISection(): JSX.Element {
  const { settings, updateSettings } = useSettingsStore()
  const [showKey, setShowKey] = useState(false)

  return (
    <Section icon={KeyRound} title="OpenAI">
      <div>
        <label className="mb-2 block text-xs text-fg-muted">OpenAI API Key</label>
        <div className="flex items-center gap-2">
          <Input
            type={showKey ? 'text' : 'password'}
            value={settings.openaiApiKey}
            onChange={(v) => updateSettings({ openaiApiKey: v })}
            placeholder="sk-proj-..."
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-fg-muted transition-colors hover:text-fg"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-fg-muted">
          Used for voice input and translation.
        </p>
      </div>
      <div>
        <label className="mb-2 block text-xs text-fg-muted">Language</label>
        <SegmentedControl
          value={settings.whisperLanguage}
          options={[
            { value: 'ru', label: 'Русский' },
            { value: 'en', label: 'English' }
          ]}
          onChange={(v) => updateSettings({ whisperLanguage: v as 'ru' | 'en' })}
        />
      </div>
    </Section>
  )
}

function NetworkSection(): JSX.Element {
  const { settings, updateSettings } = useSettingsStore()

  return (
    <Section icon={Globe} title="Network">
      <div>
        <label className="mb-2 block text-xs text-fg-muted">HTTP Proxy</label>
        <Input
          value={settings.httpProxy}
          onChange={(v) => updateSettings({ httpProxy: v })}
          placeholder="http://user:pass@host:port"
        />
        <p className="mt-2 text-[11px] text-fg-muted">
          Proxy for API requests (ElevenLabs TTS)
        </p>
      </div>
    </Section>
  )
}

function ElevenLabsSection(): JSX.Element {
  const { settings, updateSettings } = useSettingsStore()
  const [showKey, setShowKey] = useState(false)

  return (
    <Section icon={AudioLines} title="ElevenLabs">
      <div>
        <label className="mb-2 block text-xs text-fg-muted">ElevenLabs API Key</label>
        <div className="flex items-center gap-2">
          <Input
            type={showKey ? 'text' : 'password'}
            value={settings.elevenlabsApiKey}
            onChange={(v) => updateSettings({ elevenlabsApiKey: v })}
            placeholder="sk_..."
          />
          <button
            onClick={() => setShowKey((v) => !v)}
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-fg-muted transition-colors hover:text-fg"
          >
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-fg-muted">
          Used for text-to-speech.
        </p>
      </div>
    </Section>
  )
}

export function SettingsPanel(): JSX.Element {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const { settings, updateSettings, resetSettings, toggleSettings } =
    useSettingsStore()

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
          className="pointer-events-none absolute inset-0 bg-backdrop"
        />

        {/* Panel */}
        <motion.div
          initial={{ x: '100%', opacity: 0.8 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0.8 }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-full w-[440px] flex-col border-l border-border bg-settings-bg shadow-panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-7 pt-7 pb-2">
            <div>
              <h2 className="text-lg font-semibold text-fg">Settings</h2>
              <p className="mt-1 text-xs text-fg-muted">Customize your terminal</p>
            </div>
            <button
              onPointerDown={(e) => {
                e.stopPropagation()
                toggleSettings()
              }}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-none bg-transparent text-fg-muted hover:bg-surface hover:text-fg"
            >
              <X size={18} className="pointer-events-none" />
            </button>
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
                          onChange={(v) => {
                            const next = [...settings.fileAssociations]
                            next[i] = { ...next[i], pattern: v }
                            updateSettings({ fileAssociations: next })
                          }}
                          className="flex-1"
                        />
                        <Input
                          value={assoc.command}
                          placeholder="code"
                          onChange={(v) => {
                            const next = [...settings.fileAssociations]
                            next[i] = { ...next[i], command: v }
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
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-transparent px-4 py-2.5 text-sm text-fg-muted transition-colors hover:border-fg/40 hover:text-fg"
                    >
                      <Plus size={14} />
                      Add
                    </button>
                  </div>
                </Section>

                <Divider />

                {/* OpenAI */}
                <OpenAISection />

                <Divider />

                {/* ElevenLabs */}
                <ElevenLabsSection />

                <Divider />

                {/* Network */}
                <NetworkSection />

                <Divider />

                {/* IDE */}
                <IdeSection />

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
                    <FontFamilyDropdown
                      value={settings.fontFamily}
                      onChange={(v) => updateSettings({ fontFamily: v })}
                    />
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
                          max={1.5}
                          step={0.05}
                          onChange={(v) => updateSettings({ lineHeight: v })}
                        />
                        <p className="mt-1.5 text-[10px] text-fg-muted">
                          {'> 1.2 breaks box-drawing lines'}
                        </p>
                      </div>
                    </div>
                  </div>
                </Section>

                <Divider />

                {/* Zoom Step */}
                <Section icon={ZoomIn} title="Zoom">
                  <div>
                    <label className="mb-2 block text-xs text-fg-muted">Step (%)</label>
                    <NumberStepper
                      value={settings.zoomStep || 10}
                      min={5}
                      max={50}
                      step={5}
                      onChange={(v) => updateSettings({ zoomStep: v })}
                      suffix="%"
                    />
                    <p className="mt-2 text-[11px] text-fg-muted">
                      Ctrl+Plus / Ctrl+Minus / Ctrl+0
                    </p>
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
