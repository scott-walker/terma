import { Terminal, FolderOpen, type LucideIcon } from 'lucide-react'
import type { PaneType } from './layout-tree'

export interface PaneTypeConfig {
  label: string
  icon: LucideIcon
  colorClass: string
  bgActiveClass: string
  borderActiveClass: string
  paneBorderClass: string
}

export const PANE_TYPE_CONFIGS: Record<PaneType, PaneTypeConfig> = {
  terminal: {
    label: 'Terminal',
    icon: Terminal,
    colorClass: 'text-accent',
    bgActiveClass: 'bg-accent/[0.13]',
    borderActiveClass: 'border-accent/[0.27]',
    paneBorderClass: 'border-accent/50'
  },
  'file-manager': {
    label: 'Files',
    icon: FolderOpen,
    colorClass: 'text-warning',
    bgActiveClass: 'bg-warning/[0.13]',
    borderActiveClass: 'border-warning/[0.27]',
    paneBorderClass: 'border-warning/50'
  }
}
