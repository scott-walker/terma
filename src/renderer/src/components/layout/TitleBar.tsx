export function TitleBar(): JSX.Element {
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
