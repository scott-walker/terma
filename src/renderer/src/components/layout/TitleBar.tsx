import { Settings } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'
import { IconButton } from '@/components/ui/IconButton'
import { WindowControls } from '@/components/ui/WindowControls'
import logoSvg from '@/assets/terma-icon-text.svg'

export function TitleBar(): JSX.Element {
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  return (
    <div className="drag-region flex shrink-0 items-center gap-3.5 border-b border-border px-5 py-2.5">
      <img
        src={logoSvg}
        alt="Terma"
        className="h-[15px] w-auto select-none"
        draggable={false}
      />
      <span className="select-none rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-accent">
        v{__APP_VERSION__}
      </span>

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
