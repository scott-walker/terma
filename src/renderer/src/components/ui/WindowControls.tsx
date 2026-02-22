const btnBase =
  'flex h-full w-[46px] cursor-pointer items-center justify-center border-none bg-transparent text-fg-muted transition-colors duration-[120ms] hover:bg-surface-hover hover:text-fg'

export function WindowControls(): JSX.Element {
  return (
    <div className="flex h-8">
      <button
        onClick={() => window.api.window.minimize()}
        title="Minimize"
        className={btnBase}
      >
        <svg width="10" height="1" viewBox="0 0 10 1">
          <line x1="0" y1="0.5" x2="10" y2="0.5" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        onClick={() => window.api.window.maximize()}
        title="Maximize"
        className={btnBase}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" />
        </svg>
      </button>
      <button
        onClick={() => window.api.window.close()}
        title="Close"
        className="flex h-full w-[46px] cursor-pointer items-center justify-center border-none bg-transparent text-fg-muted transition-colors duration-[120ms] hover:bg-window-close hover:text-window-close-fg"
      >
        <svg width="10" height="10" viewBox="0 0 10 10">
          <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2" />
          <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  )
}
