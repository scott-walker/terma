// Layout types (pure data, no runtime deps)
export type PaneType = 'terminal' | 'file-manager' | 'agent' | 'markdown' | 'image' | 'system-monitor'

export interface CpuCoreLoad {
  core: number
  load: number
}

export interface DiskInfo {
  fs: string
  size: number
  used: number
  usedPercent: number
  mount: string
}

export interface SystemMetrics {
  processCount: number
  ram: { total: number; used: number; free: number; usedPercent: number }
  cpu: { cores: number; model: string; avgLoad: number; coreLoads: CpuCoreLoad[] }
  disks: DiskInfo[]
}

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

export interface SelfMetrics {
  /** Resident Set Size in bytes (total memory footprint) */
  rss: number
  /** V8 heap used in bytes */
  heapUsed: number
  /** V8 heap total in bytes */
  heapTotal: number
  /** CPU percent (0-100) since last measurement */
  cpuPercent: number
  /** Number of active PTY sessions */
  ptyCount: number
  /** Uptime in seconds */
  uptime: number
}

export interface SessionState {
  tabs: Record<string, TabSnapshot>
  tabOrder: string[]
  activeTabId: string | null
  fileManagerPanes: Record<string, { rootPath: string; expandedDirs: string[] }>
}
