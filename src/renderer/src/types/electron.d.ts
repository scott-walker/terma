import type { FileEntry, FsEvent, SessionState } from '@shared/types'
import type { TerminalSettings } from '@shared/settings'

interface PtyApi {
  create(opts?: { cols?: number; rows?: number; cwd?: string; command?: string; args?: string[] }): Promise<string>
  write(id: string, data: string): void
  resize(id: string, cols: number, rows: number): void
  destroy(id: string): void
  onData(id: string, cb: (data: string) => void): () => void
  onExit(id: string, cb: (exitCode: number, signal: number) => void): () => void
  getCwd(id: string): Promise<string | null>
}

interface FsApi {
  readDir(dirPath: string): Promise<FileEntry[]>
  readFile(filePath: string): Promise<string>
  readFileAsDataUrl(filePath: string): Promise<string>
  stat(filePath: string): Promise<FileEntry>
  rename(oldPath: string, newPath: string): Promise<void>
  delete(filePath: string): Promise<void>
  restore(originalPaths: string[]): Promise<{ ok: number; fail: number }>
  copy(srcPath: string, destDir: string): Promise<void>
  onCopyProgress(cb: (progress: { done: number; total: number }) => void): () => void
  watch(dirPath: string): void
  unwatch(dirPath: string): void
  onFsEvent(cb: (event: FsEvent) => void): () => void
}

interface SettingsApi {
  get(): Promise<TerminalSettings>
  update(partial: Partial<TerminalSettings>): Promise<TerminalSettings>
  reset(): Promise<TerminalSettings>
  onChanged(cb: (settings: TerminalSettings) => void): () => void
}

interface SessionApi {
  save(state: SessionState): Promise<void>
  load(): Promise<SessionState | null>
}

interface ShellApi {
  openPath(path: string): Promise<string>
  openWith(command: string, filePath: string): Promise<void>
  homePath: string
  platform: 'darwin' | 'win32' | 'linux'
}

interface ClipboardApi {
  readFilePaths(): Promise<string[]>
  writeFilePaths(paths: string[]): Promise<void>
  saveImage(destDir: string): Promise<string | null>
}

interface WindowApi {
  minimize(): void
  maximize(): void
  close(): void
  forceClose(): void
  isMaximized(): Promise<boolean>
  onMaximizedChange(cb: (maximized: boolean) => void): () => void
  onConfirmClose(cb: () => void): () => void
}

interface WhisperApi {
  transcribe(audioBuffer: ArrayBuffer): Promise<string>
}

interface LogApi {
  getLogs(): Promise<import('@shared/types').LogEntry[]>
  onLog(cb: (entry: import('@shared/types').LogEntry) => void): () => void
}

interface TranslateApi {
  translate(text: string): Promise<string>
}

interface SysmonApi {
  getMetrics(): Promise<import('@shared/types').SystemMetrics>
}

interface GitApi {
  getInfo(cwd: string): Promise<{ repo: string; branch: string; url: string | null } | null>
  listBranches(cwd: string): Promise<{ name: string; current: boolean; isRemote: boolean }[]>
  checkout(cwd: string, branch: string): Promise<void>
  createBranch(cwd: string, name: string): Promise<void>
}

interface SelfmonApi {
  getMetrics(): Promise<import('@shared/types').SelfMetrics>
}

interface SshApi {
  connect(profileId: string): Promise<void>
  disconnect(profileId: string): Promise<void>
  readDir(profileId: string, remotePath: string): Promise<FileEntry[]>
  getHomeDir(profileId: string): Promise<string>
}

declare global {
  interface Window {
    api: {
      pty: PtyApi
      fs: FsApi
      settings: SettingsApi
      session: SessionApi
      shell: ShellApi
      clipboard: ClipboardApi
      window: WindowApi
      whisper: WhisperApi
      log: LogApi
      ssh: SshApi
      translate: TranslateApi
      sysmon: SysmonApi
      selfmon: SelfmonApi
      git: GitApi
    }
  }
}

export {}
