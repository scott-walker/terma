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
}

interface FsApi {
  readDir(dirPath: string): Promise<FileEntry[]>
  stat(filePath: string): Promise<FileEntry>
  rename(oldPath: string, newPath: string): Promise<void>
  delete(filePath: string): Promise<void>
  watch(dirPath: string): void
  unwatch(dirPath: string): void
  onFsEvent(cb: (event: FsEvent) => void): () => void
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
      window: WindowApi
    }
  }
}

export {}
