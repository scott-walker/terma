import { useSettingsStore } from '@/stores/settings-store'

export function TitleBar(): JSX.Element {
  const toggleSettings = useSettingsStore((s) => s.toggleSettings)
  return (
    <div className="flex h-10 items-center justify-between bg-[#16161e] select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2 pl-4">
        <span className="text-sm font-semibold text-[#c0caf5]">Terma</span>
      </div>
      <div
        className="flex h-full"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          className="flex h-full w-12 items-center justify-center text-[#565f89] hover:bg-[#1a1b26] hover:text-[#c0caf5]"
          onClick={toggleSettings}
          title="Settings (Ctrl+Shift+,)"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button
          className="flex h-full w-12 items-center justify-center text-[#565f89] hover:bg-[#1a1b26] hover:text-[#c0caf5]"
          onClick={() => window.api.window.minimize()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><rect y="5" width="12" height="2" fill="currentColor" /></svg>
        </button>
        <button
          className="flex h-full w-12 items-center justify-center text-[#565f89] hover:bg-[#1a1b26] hover:text-[#c0caf5]"
          onClick={() => window.api.window.maximize()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1" y="1" width="10" height="10" stroke="currentColor" strokeWidth="1.5" fill="none" /></svg>
        </button>
        <button
          className="flex h-full w-12 items-center justify-center text-[#565f89] hover:bg-[#f7768e] hover:text-white"
          onClick={() => window.api.window.close()}
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" /></svg>
        </button>
      </div>
    </div>
  )
}
