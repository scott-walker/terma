import { useSettingsStore } from '@/stores/settings-store'
import { PRESET_THEMES } from '@shared/themes'

export function SettingsPanel(): JSX.Element {
  const { settings, updateSettings, resetSettings, zoomIn, zoomOut, zoomReset, toggleSettings } =
    useSettingsStore()
  const effectiveFontSize = useSettingsStore((s) => s.getEffectiveFontSize())

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={toggleSettings}>
      <div
        className="w-[480px] max-h-[80vh] overflow-y-auto rounded-lg border border-[#3b3d57] bg-[#1e1f2e] text-[#c0caf5] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#3b3d57] px-5 py-4">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            onClick={toggleSettings}
            className="text-[#565f89] hover:text-[#c0caf5]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Theme */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#565f89] uppercase tracking-wide">Theme</label>
            <select
              value={settings.activeThemeId}
              onChange={(e) => updateSettings({ activeThemeId: e.target.value })}
              className="w-full rounded border border-[#3b3d57] bg-[#16161e] px-3 py-2 text-sm text-[#c0caf5] outline-none focus:border-[#7aa2f7]"
            >
              {PRESET_THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.name}
                </option>
              ))}
            </select>
          </div>

          {/* Font Family */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#565f89] uppercase tracking-wide">Font Family</label>
            <input
              type="text"
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              className="w-full rounded border border-[#3b3d57] bg-[#16161e] px-3 py-2 text-sm text-[#c0caf5] outline-none focus:border-[#7aa2f7]"
            />
          </div>

          {/* Font Size + Zoom */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#565f89] uppercase tracking-wide">Font Size</label>
              <input
                type="number"
                min={8}
                max={32}
                value={settings.fontSize}
                onChange={(e) => updateSettings({ fontSize: Number(e.target.value) })}
                className="w-full rounded border border-[#3b3d57] bg-[#16161e] px-3 py-2 text-sm text-[#c0caf5] outline-none focus:border-[#7aa2f7]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#565f89] uppercase tracking-wide">
                Zoom ({settings.zoomLevel >= 0 ? '+' : ''}{settings.zoomLevel}) = {effectiveFontSize}px
              </label>
              <div className="flex gap-1">
                <button onClick={zoomOut} className="flex-1 rounded border border-[#3b3d57] bg-[#16161e] py-2 text-sm hover:bg-[#282a3a]">-</button>
                <button onClick={zoomReset} className="flex-1 rounded border border-[#3b3d57] bg-[#16161e] py-2 text-sm hover:bg-[#282a3a]">0</button>
                <button onClick={zoomIn} className="flex-1 rounded border border-[#3b3d57] bg-[#16161e] py-2 text-sm hover:bg-[#282a3a]">+</button>
              </div>
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#565f89] uppercase tracking-wide">Line Height</label>
            <input
              type="number"
              min={1}
              max={2}
              step={0.1}
              value={settings.lineHeight}
              onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
              className="w-full rounded border border-[#3b3d57] bg-[#16161e] px-3 py-2 text-sm text-[#c0caf5] outline-none focus:border-[#7aa2f7]"
            />
          </div>

          {/* Cursor */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#565f89] uppercase tracking-wide">Cursor Style</label>
              <select
                value={settings.cursorStyle}
                onChange={(e) => updateSettings({ cursorStyle: e.target.value as 'bar' | 'block' | 'underline' })}
                className="w-full rounded border border-[#3b3d57] bg-[#16161e] px-3 py-2 text-sm text-[#c0caf5] outline-none focus:border-[#7aa2f7]"
              >
                <option value="bar">Bar</option>
                <option value="block">Block</option>
                <option value="underline">Underline</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#565f89] uppercase tracking-wide">Cursor Blink</label>
              <button
                onClick={() => updateSettings({ cursorBlink: !settings.cursorBlink })}
                className={`w-full rounded border px-3 py-2 text-sm ${
                  settings.cursorBlink
                    ? 'border-[#7aa2f7] bg-[#7aa2f7]/10 text-[#7aa2f7]'
                    : 'border-[#3b3d57] bg-[#16161e] text-[#565f89]'
                }`}
              >
                {settings.cursorBlink ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {/* Scrollback */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[#565f89] uppercase tracking-wide">Scrollback Lines</label>
            <input
              type="number"
              min={1000}
              max={100000}
              step={1000}
              value={settings.scrollback}
              onChange={(e) => updateSettings({ scrollback: Number(e.target.value) })}
              className="w-full rounded border border-[#3b3d57] bg-[#16161e] px-3 py-2 text-sm text-[#c0caf5] outline-none focus:border-[#7aa2f7]"
            />
          </div>

          {/* Reset */}
          <button
            onClick={resetSettings}
            className="w-full rounded border border-[#f7768e]/30 bg-[#f7768e]/10 px-3 py-2 text-sm text-[#f7768e] hover:bg-[#f7768e]/20"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  )
}
