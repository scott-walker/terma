interface TabItemProps {
  title: string
  isActive: boolean
  canClose: boolean
  onClick: () => void
  onClose: () => void
}

export function TabItem({ title, isActive, canClose, onClick, onClose }: TabItemProps): JSX.Element {
  return (
    <div
      onClick={onClick}
      className={`flex cursor-pointer select-none items-center gap-2.5 whitespace-nowrap px-5 py-2.5 text-[13px] transition-all ${
        isActive
          ? 'border-b-2 border-accent bg-elevated text-fg'
          : 'border-b-2 border-transparent text-fg-muted'
      }`}
    >
      <span
        className={`text-sm text-accent ${isActive ? 'opacity-100' : 'opacity-40'}`}
      >
        ›_
      </span>
      {title}
      {canClose && (
        <span
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          className="ml-1 cursor-pointer text-base leading-none opacity-40 hover:opacity-70"
        >
          ×
        </span>
      )}
    </div>
  )
}
