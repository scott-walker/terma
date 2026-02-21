import { contextBridge, ipcRenderer } from 'electron'
import { homedir } from 'os'
import { PTY_CHANNELS, FS_CHANNELS, SETTINGS_CHANNELS, SESSION_CHANNELS, SHELL_CHANNELS } from '../shared/channels'
import type { TerminalSettings } from '../shared/settings'

const ptyApi = {
  create: (opts?: { cols?: number; rows?: number; cwd?: string }): Promise<string> =>
    ipcRenderer.invoke(PTY_CHANNELS.CREATE, opts),
  write: (id: string, data: string): void => {
    ipcRenderer.send(PTY_CHANNELS.WRITE, id, data)
  },
  resize: (id: string, cols: number, rows: number): void => {
    ipcRenderer.send(PTY_CHANNELS.RESIZE, id, cols, rows)
  },
  destroy: (id: string): void => {
    ipcRenderer.send(PTY_CHANNELS.DESTROY, id)
  },
  getCwd: (id: string): Promise<string | null> =>
    ipcRenderer.invoke(PTY_CHANNELS.GET_CWD, id),
  onData: (cb: (id: string, data: string) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, id: string, data: string): void => {
      cb(id, data)
    }
    ipcRenderer.on(PTY_CHANNELS.DATA, listener)
    return () => ipcRenderer.removeListener(PTY_CHANNELS.DATA, listener)
  },
  onExit: (cb: (id: string, exitCode: number, signal: number) => void): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      id: string,
      exitCode: number,
      signal: number
    ): void => {
      cb(id, exitCode, signal)
    }
    ipcRenderer.on(PTY_CHANNELS.EXIT, listener)
    return () => ipcRenderer.removeListener(PTY_CHANNELS.EXIT, listener)
  }
}

const fsApi = {
  readDir: (dirPath: string): Promise<unknown[]> =>
    ipcRenderer.invoke(FS_CHANNELS.READ_DIR, dirPath),
  stat: (filePath: string): Promise<unknown> =>
    ipcRenderer.invoke(FS_CHANNELS.STAT, filePath),
  rename: (oldPath: string, newPath: string): Promise<void> =>
    ipcRenderer.invoke(FS_CHANNELS.RENAME, oldPath, newPath),
  delete: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(FS_CHANNELS.DELETE, filePath),
  copy: (srcPath: string, destDir: string): Promise<void> =>
    ipcRenderer.invoke(FS_CHANNELS.COPY, srcPath, destDir),
  onCopyProgress: (
    cb: (progress: { done: number; total: number }) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      progress: { done: number; total: number }
    ): void => {
      cb(progress)
    }
    ipcRenderer.on(FS_CHANNELS.COPY_PROGRESS, listener)
    return () => ipcRenderer.removeListener(FS_CHANNELS.COPY_PROGRESS, listener)
  },
  watch: (dirPath: string): void => {
    ipcRenderer.send(FS_CHANNELS.WATCH, dirPath)
  },
  unwatch: (dirPath: string): void => {
    ipcRenderer.send(FS_CHANNELS.UNWATCH, dirPath)
  },
  onFsEvent: (
    cb: (event: { event: string; path: string; dirPath: string }) => void
  ): (() => void) => {
    const listener = (
      _event: Electron.IpcRendererEvent,
      data: { event: string; path: string; dirPath: string }
    ): void => {
      cb(data)
    }
    ipcRenderer.on(FS_CHANNELS.FS_EVENT, listener)
    return () => ipcRenderer.removeListener(FS_CHANNELS.FS_EVENT, listener)
  }
}

const settingsApi = {
  get: (): Promise<TerminalSettings> => ipcRenderer.invoke(SETTINGS_CHANNELS.GET),
  update: (partial: Partial<TerminalSettings>): Promise<TerminalSettings> =>
    ipcRenderer.invoke(SETTINGS_CHANNELS.UPDATE, partial),
  reset: (): Promise<TerminalSettings> => ipcRenderer.invoke(SETTINGS_CHANNELS.RESET),
  onChanged: (cb: (settings: TerminalSettings) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, settings: TerminalSettings): void => {
      cb(settings)
    }
    ipcRenderer.on(SETTINGS_CHANNELS.CHANGED, listener)
    return () => ipcRenderer.removeListener(SETTINGS_CHANNELS.CHANGED, listener)
  }
}

const sessionApi = {
  save: (state: unknown): Promise<void> =>
    ipcRenderer.invoke(SESSION_CHANNELS.SAVE, state),
  load: (): Promise<unknown> =>
    ipcRenderer.invoke(SESSION_CHANNELS.LOAD)
}

const shellApi = {
  openPath: (path: string): Promise<string> =>
    ipcRenderer.invoke(SHELL_CHANNELS.OPEN_PATH, path),
  homePath: homedir()
}

const windowApi = {
  minimize: (): void => ipcRenderer.send('window:minimize'),
  maximize: (): void => ipcRenderer.send('window:maximize'),
  close: (): void => ipcRenderer.send('window:close')
}

contextBridge.exposeInMainWorld('api', {
  pty: ptyApi,
  fs: fsApi,
  settings: settingsApi,
  session: sessionApi,
  shell: shellApi,
  window: windowApi
})
