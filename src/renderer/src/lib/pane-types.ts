import { Terminal, FolderOpen, type LucideIcon } from 'lucide-react'
import type { PaneType } from './layout-tree'

export interface PaneTypeConfig {
  label: string
  icon: LucideIcon
  color: string
  colorClass: string
}

export const PANE_TYPE_CONFIGS: Record<PaneType, PaneTypeConfig> = {
  terminal: {
    label: 'Terminal',
    icon: Terminal,
    color: '#00d25b',
    colorClass: 'text-accent'
  },
  'file-manager': {
    label: 'Files',
    icon: FolderOpen,
    color: '#57caeb',
    colorClass: 'text-info'
  }
}
