import type { LucideIcon } from 'lucide-react'

interface IconButtonProps {
  icon: LucideIcon
  onClick: (e: React.MouseEvent) => void
  title?: string
  variant?: 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const variantClasses = {
  ghost: 'text-fg-muted hover:text-fg',
  danger: 'text-danger hover:text-danger/80'
} as const

export function IconButton({
  icon: Icon,
  onClick,
  title,
  variant = 'ghost',
  size = 'sm'
}: IconButtonProps): JSX.Element {
  const iconSize = size === 'sm' ? 18 : 20

  return (
    <button
      onClick={onClick}

      className={`cursor-pointer rounded-sm border-none bg-transparent px-1.5 py-1 leading-none transition-colors ${variantClasses[variant]}`}
    >
      <Icon size={iconSize} strokeWidth={1.8} />
    </button>
  )
}
