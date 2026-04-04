import { Terminal, FolderOpen, Bot, FileText, Image, Monitor, type LucideIcon } from 'lucide-react'
import type { PaneType } from './layout-tree'

export interface PaneTypeConfig {
  label: string
  icon: LucideIcon
}

const PANE_ACTIVE_CLASSES = {
  colorClass: 'text-pane-active',
  bgActiveClass: 'bg-pane-active/[0.13]',
  borderActiveClass: 'border-pane-active/[0.27]',
  paneBorderClass: 'border-pane-active/50'
} as const

export const PANE_TYPE_CONFIGS: Record<PaneType, PaneTypeConfig> = {
  terminal: {
    label: 'Terminal',
    icon: Terminal
  },
  'file-manager': {
    label: 'Files',
    icon: FolderOpen
  },
  agent: {
    label: 'Agent',
    icon: Bot
  },
  markdown: {
    label: 'Markdown',
    icon: FileText
  },
  image: {
    label: 'Image',
    icon: Image
  },
  'system-monitor': {
    label: 'Monitoring',
    icon: Monitor
  }
}

export { PANE_ACTIVE_CLASSES }
