import { type ReactNode } from 'react'

const variants = {
  ghost:
    'text-fg-muted hover:bg-overlay-subtle hover:text-fg',
  surface:
    'bg-surface text-fg-muted hover:bg-surface-hover hover:text-fg',
  'danger-ghost':
    'text-fg-muted hover:bg-danger hover:text-fg'
} as const

const sizes = {
  sm: 'h-7 w-7 rounded-md',
  md: 'h-9 w-9 rounded-lg'
} as const

interface ButtonProps {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  icon?: ReactNode
  children?: ReactNode
  className?: string
  title?: string
  onClick: () => void
}

export function Button({
  variant = 'ghost',
  size = 'md',
  icon,
  children,
  className = '',
  title,
  onClick
}: ButtonProps): JSX.Element {
  const base = 'flex items-center justify-center transition-all duration-150'
  const cls = children
    ? `${base} gap-2 px-3 ${variants[variant]} rounded-lg ${className}`
    : `${base} ${sizes[size]} ${variants[variant]} ${className}`

  return (
    <button className={cls} onClick={onClick} title={title}>
      {icon}
      {children}
    </button>
  )
}
