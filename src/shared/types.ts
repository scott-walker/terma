// Layout types (pure data, no runtime deps)
export type PaneType = 'terminal' | 'file-manager' | 'agent'

export interface PaneNode {
  type: 'pane'
  id: string
  paneType: PaneType
  terminalId: string | null
  cwd: string | null
}

export interface BranchNode {
  type: 'branch'
  id: string
  direction: 'horizontal' | 'vertical'
  children: LayoutNode[]
  ratios: number[]
}

export type LayoutNode = PaneNode | BranchNode

// IPC contract types
export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  size: number
  modified: number
}

export interface FsEvent {
  event: string
  path: string
  dirPath: string
}

export interface PtyCreateOpts {
  cols?: number
  rows?: number
  cwd?: string
  command?: string
  args?: string[]
}

export interface TabSnapshot {
  id: string
  title: string
  color?: string | null
  layoutTree: LayoutNode
  activePaneId: string
}

// Logger types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: number
  level: LogLevel
  source: string
  message: string
  data?: unknown
}

export interface SessionState {
  tabs: Record<string, TabSnapshot>
  tabOrder: string[]
  activeTabId: string | null
  fileManagerPanes: Record<string, { rootPath: string; expandedDirs: string[] }>
}
