import { Settings } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'
import { IconButton } from '@/components/ui/IconButton'
import { WindowControls } from '@/components/ui/WindowControls'

export function TitleBar(): JSX.Element {
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  return (
    <div className="drag-region flex shrink-0 items-center gap-3.5 border-b border-border px-5 py-2.5">
      {/* Logo — gradient text */}
      <div className="text-gradient-logo text-[17px] font-semibold tracking-tight">
        terma
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
