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
      className={`group relative flex h-8 max-w-52 cursor-pointer items-center gap-2 rounded-lg px-3.5 text-[13px] transition-all duration-150 ${
        active
          ? 'bg-white/[0.08] text-[#c0caf5]'
          : 'text-[#565f89] hover:bg-white/[0.04] hover:text-[#a9b1d6]'
      }`}
      onClick={onClick}
    >
      {active && (
        <div className="absolute bottom-0 left-1/2 h-[2px] w-5 -translate-x-1/2 rounded-full bg-[#7aa2f7]" />
      )}
      <span className="truncate leading-none">{title}</span>
      <button
        className="-mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md opacity-0 transition-all duration-150 hover:bg-white/[0.1] group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onClose()
        }}
      >
        <X size={11} strokeWidth={2} />
      </button>
    </div>
  )
}
