interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  size: number
  modified: number
}

interface FsEvent {
  event: string
  path: string
  dirPath: string
}

interface PtyApi {
  create(opts?: { cols?: number; rows?: number; cwd?: string }): Promise<string>
  write(id: string, data: string): void
  resize(id: string, cols: number, rows: number): void
  destroy(id: string): void
  onData(cb: (id: string, data: string) => void): () => void
  onExit(cb: (id: string, exitCode: number, signal: number) => void): () => void
  getCwd(id: string): Promise<string | null>
}

interface FsApi {
  readDir(dirPath: string): Promise<FileEntry[]>
  stat(filePath: string): Promise<FileEntry>
  rename(oldPath: string, newPath: string): Promise<void>
  delete(filePath: string): Promise<void>
  copy(srcPath: string, destDir: string): Promise<void>
  onCopyProgress(cb: (progress: { done: number; total: number }) => void): () => void
  watch(dirPath: string): void
  unwatch(dirPath: string): void
  onFsEvent(cb: (event: FsEvent) => void): () => void
}

interface TerminalSettings {
  activeThemeId: string
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorBlink: boolean
  cursorStyle: 'bar' | 'block' | 'underline'
  scrollback: number
  zoomLevel: number
}

interface SettingsApi {
  get(): Promise<TerminalSettings>
  update(partial: Partial<TerminalSettings>): Promise<TerminalSettings>
  reset(): Promise<TerminalSettings>
  onChanged(cb: (settings: TerminalSettings) => void): () => void
}

interface SessionState {
  tabs: Record<string, unknown>
  tabOrder: string[]
  activeTabId: string | null
  fileManagerPanes: Record<string, { rootPath: string; expandedDirs: string[] }>
}

interface SessionApi {
  save(state: SessionState): Promise<void>
  load(): Promise<SessionState | null>
}

interface ShellApi {
  openPath(path: string): Promise<string>
  homePath: string
}

interface WindowApi {
  minimize(): void
  maximize(): void
  close(): void
}

declare global {
  interface Window {
    api: {
      pty: PtyApi
      fs: FsApi
      settings: SettingsApi
      session: SessionApi
      shell: ShellApi
      window: WindowApi
    }
  }
}

export {}
