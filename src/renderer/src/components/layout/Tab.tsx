interface TabItemProps {
  title: string
  active: boolean
  onClick: () => void
  onClose: () => void
}

export function TabItem({ title, active, onClick, onClose }: TabItemProps): JSX.Element {
  return (
    <div
      className={`group flex h-7 max-w-48 cursor-pointer items-center gap-1 rounded-md px-3 text-xs transition-colors ${
        active
          ? 'bg-[#1a1b26] text-[#c0caf5]'
          : 'text-[#565f89] hover:bg-[#1a1b26]/50 hover:text-[#a9b1d6]'
      }`}
      onClick={onClick}
    >
      <span className="truncate">{title}</span>
      <button
        className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-[#414868] group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8">
          <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>
    </div>
  )
}
