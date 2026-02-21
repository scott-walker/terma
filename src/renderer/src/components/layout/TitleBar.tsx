import { Settings, Minus, Square, X } from 'lucide-react'
import { useSettingsStore } from '@/stores/settings-store'

function TitleButton({
  children,
  onClick,
  title,
  hoverClass = 'hover:bg-white/[0.06] hover:text-[#c0caf5]'
}: {
  children: React.ReactNode
  onClick: () => void
  title?: string
  hoverClass?: string
}): JSX.Element {
  return (
    <button
      className={`flex h-full w-11 items-center justify-center text-[#565f89] transition-all duration-150 ${hoverClass}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  )
}

export function TitleBar(): JSX.Element {
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)

  return (
    <div
      className="flex h-10 items-center justify-between border-b border-white/[0.04] bg-[#0f0f17] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2.5 pl-4">
        <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-[#7aa2f7] to-[#bb9af7]">
          <span className="text-[10px] font-bold text-white">T</span>
        </div>
        <span className="text-[13px] font-semibold tracking-tight text-[#c0caf5]/90">Terma</span>
      </div>
      <div
        className="flex h-full items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <TitleButton onClick={toggleSettings} title="Settings (Ctrl+Shift+,)">
          <Settings size={14} strokeWidth={1.8} />
        </TitleButton>
        <div className="mx-1 h-4 w-px bg-white/[0.06]" />
        <TitleButton onClick={() => window.api.window.minimize()} title="Minimize">
          <Minus size={14} strokeWidth={1.8} />
        </TitleButton>
        <TitleButton onClick={() => window.api.window.maximize()} title="Maximize">
          <Square size={11} strokeWidth={1.8} />
        </TitleButton>
        <TitleButton
          onClick={() => window.api.window.close()}
          title="Close"
          hoverClass="hover:bg-[#f7768e] hover:text-white"
        >
          <X size={14} strokeWidth={1.8} />
        </TitleButton>
      </div>
    </div>
  )
}
