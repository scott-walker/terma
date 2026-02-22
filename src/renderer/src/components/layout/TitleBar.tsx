import { Settings, TerminalSquare } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'
import { IconButton } from '@/components/ui/IconButton'
import { WindowControls } from '@/components/ui/WindowControls'

export function TitleBar(): JSX.Element {
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  return (
    <div className="drag-region flex shrink-0 items-center gap-3.5 border-b border-border px-5 py-2.5">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <TerminalSquare className="size-4 text-accent" strokeWidth={2} />
        <div
          className="text-[24px] font-semibold uppercase tracking-widest text-white"
          style={{ fontFamily: "'Rajdhani', sans-serif" }}
        >
          terma
        </div>
      </div>

      <div className="flex-1" />

      {/* Right: settings + window controls */}
      <div className="no-drag-region flex items-center gap-3">
        <IconButton
          icon={Settings}
          onClick={() => toggleSettings()}
          title="Settings (Ctrl+Shift+,)"
        />
        <WindowControls />
      </div>
    </div>
  )
}
