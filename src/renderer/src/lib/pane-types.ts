import { Terminal, FolderOpen, Bot, /* FileCode, */ type LucideIcon } from 'lucide-react'
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
    colorClass: 'text-pane-active-terminal',
    bgActiveClass: 'bg-pane-active-terminal/[0.13]',
    borderActiveClass: 'border-pane-active-terminal/[0.27]',
    paneBorderClass: 'border-pane-active-terminal/50'
  },
  'file-manager': {
    label: 'Files',
    icon: FolderOpen,
    colorClass: 'text-pane-active-files',
    bgActiveClass: 'bg-pane-active-files/[0.13]',
    borderActiveClass: 'border-pane-active-files/[0.27]',
    paneBorderClass: 'border-pane-active-files/50'
  },
  agent: {
    label: 'Agent',
    icon: Bot,
    colorClass: 'text-pane-active-agent',
    bgActiveClass: 'bg-pane-active-agent/[0.13]',
    borderActiveClass: 'border-pane-active-agent/[0.27]',
    paneBorderClass: 'border-pane-active-agent/50'
  }
  // editor: {
  //   label: 'Editor',
  //   icon: FileCode,
  //   colorClass: 'text-info',
  //   bgActiveClass: 'bg-info/[0.13]',
  //   borderActiveClass: 'border-info/[0.27]',
  //   paneBorderClass: 'border-info/50'
  // }
}
