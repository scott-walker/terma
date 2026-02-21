import { X } from 'lucide-react'

interface TabItemProps {
  title: string
  active: boolean
  onClick: () => void
  onClose: () => void
}

export function TabItem({ title, active, onClick, onClose }: TabItemProps): JSX.Element {
  return (
    <div
      className={`group relative flex h-[30px] max-w-48 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-xs transition-all duration-150 ${
        active
          ? 'bg-white/[0.08] text-[#c0caf5] shadow-sm'
          : 'text-[#565f89] hover:bg-white/[0.04] hover:text-[#a9b1d6]'
      }`}
      onClick={onClick}
    >
      {active && (
        <div className="absolute bottom-0 left-1/2 h-[2px] w-4 -translate-x-1/2 rounded-full bg-[#7aa2f7]" />
      )}
      <span className="truncate font-medium">{title}</span>
      <button
        className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-md opacity-0 transition-all duration-150 hover:bg-white/[0.1] group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X size={10} strokeWidth={2} />
      </button>
    </div>
  )
}
