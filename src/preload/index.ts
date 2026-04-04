import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { homedir } from 'os'
import { PTY_CHANNELS, FS_CHANNELS, SETTINGS_CHANNELS, SESSION_CHANNELS, SHELL_CHANNELS, CLIPBOARD_CHANNELS, WHISPER_CHANNELS, WINDOW_CHANNELS, LOG_CHANNELS, SSH_CHANNELS, TRANSLATE_CHANNELS, TTS_CHANNELS, SYSMON_CHANNELS, GIT_CHANNELS, SELFMON_CHANNELS, SHARE_CHANNELS } from '../shared/channels'
import type { TerminalSettings } from '../shared/settings'
import type { FileEntry, SessionState, LogEntry, SystemMetrics, SelfMetrics } from '../shared/types'
import type { ShareSessionInfo } from '../shared/share-types'

// Per-PTY dispatch: single IPC listener, O(1) lookup per event
const dataListeners = new Map<string, (data: string) => void>()
const exitListeners = new Map<string, (exitCode: number, signal: number) => void>()

ipcRenderer.on(PTY_CHANNELS.DATA, (_event, id: string, data: string) => {
  dataListeners.get(id)?.(data)
})

ipcRenderer.on(PTY_CHANNELS.EXIT, (_event, id: string, exitCode: number, signal: number) => {
  exitListeners.get(id)?.(exitCode, signal)
})

const ptyApi = {
  create: (opts?: { cols?: number; rows?: number; cwd?: string; command?: string; args?: string[] }): Promise<string> =>
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
  onData: (id: string, cb: (data: string) => void): (() => void) => {
    dataListeners.set(id, cb)
    return () => { dataListeners.delete(id) }
  },
  onExit: (id: string, cb: (exitCode: number, signal: number) => void): (() => void) => {
    exitListeners.set(id, cb)
    return () => { exitListeners.delete(id) }
  }
}

const fsApi = {
  readDir: (dirPath: string): Promise<FileEntry[]> =>
    ipcRenderer.invoke(FS_CHANNELS.READ_DIR, dirPath),
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(FS_CHANNELS.READ_FILE, filePath),
  readFileAsDataUrl: (filePath: string): Promise<string> =>
    ipcRenderer.invoke(FS_CHANNELS.READ_FILE_DATA_URL, filePath),
  stat: (filePath: string): Promise<FileEntry> =>
    ipcRenderer.invoke(FS_CHANNELS.STAT, filePath),
  rename: (oldPath: string, newPath: string): Promise<void> =>
    ipcRenderer.invoke(FS_CHANNELS.RENAME, oldPath, newPath),
  delete: (filePath: string): Promise<void> =>
    ipcRenderer.invoke(FS_CHANNELS.DELETE, filePath),
  restore: (originalPaths: string[]): Promise<{ ok: number; fail: number }> =>
    ipcRenderer.invoke(FS_CHANNELS.RESTORE, originalPaths),
  copy: (srcPath: string, destDir: string): Promise<void> =>
    ipcRenderer.invoke(FS_CHANNELS.COPY, srcPath, destDir),
  searchFiles: (rootDir: string, query: string): Promise<FileEntry[]> =>
    ipcRenderer.invoke(FS_CHANNELS.SEARCH_FILES, rootDir, query),
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
  save: (state: SessionState): Promise<void> =>
    ipcRenderer.invoke(SESSION_CHANNELS.SAVE, state),
  load: (): Promise<SessionState | null> =>
    ipcRenderer.invoke(SESSION_CHANNELS.LOAD)
}

const shellApi = {
  openPath: (path: string): Promise<string> =>
    ipcRenderer.invoke(SHELL_CHANNELS.OPEN_PATH, path),
  openWith: (command: string, filePath: string): Promise<void> =>
    ipcRenderer.invoke(SHELL_CHANNELS.OPEN_WITH, command, filePath),
  homePath: homedir(),
  platform: process.platform as 'darwin' | 'win32' | 'linux'
}

const clipboardApi = {
  readFilePaths: (): Promise<string[]> =>
    ipcRenderer.invoke(CLIPBOARD_CHANNELS.READ_FILE_PATHS),
  writeFilePaths: (paths: string[]): Promise<void> =>
    ipcRenderer.invoke(CLIPBOARD_CHANNELS.WRITE_FILE_PATHS, paths),
  saveImage: (destDir: string): Promise<string | null> =>
    ipcRenderer.invoke(CLIPBOARD_CHANNELS.SAVE_IMAGE, destDir)
}

const windowApi = {
  minimize: (): void => ipcRenderer.send(WINDOW_CHANNELS.MINIMIZE),
  maximize: (): void => ipcRenderer.send(WINDOW_CHANNELS.MAXIMIZE),
  close: (): void => ipcRenderer.send(WINDOW_CHANNELS.CLOSE),
  forceClose: (): void => ipcRenderer.send(WINDOW_CHANNELS.FORCE_CLOSE),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke(WINDOW_CHANNELS.IS_MAXIMIZED),
  onMaximizedChange: (cb: (maximized: boolean) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: boolean): void => {
      cb(maximized)
    }
    ipcRenderer.on(WINDOW_CHANNELS.MAXIMIZED_CHANGE, listener)
    return () => ipcRenderer.removeListener(WINDOW_CHANNELS.MAXIMIZED_CHANGE, listener)
  },
  onConfirmClose: (cb: () => void): (() => void) => {
    const listener = (): void => { cb() }
    ipcRenderer.on(WINDOW_CHANNELS.CONFIRM_CLOSE, listener)
    return () => ipcRenderer.removeListener(WINDOW_CHANNELS.CONFIRM_CLOSE, listener)
  }
}

const whisperApi = {
  transcribe: (audioBuffer: ArrayBuffer): Promise<string> =>
    ipcRenderer.invoke(WHISPER_CHANNELS.TRANSCRIBE, audioBuffer)
}

const logApi = {
  getLogs: (): Promise<LogEntry[]> =>
    ipcRenderer.invoke(LOG_CHANNELS.GET_LOGS),
  onLog: (cb: (entry: LogEntry) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, entry: LogEntry): void => {
      cb(entry)
    }
    ipcRenderer.on(LOG_CHANNELS.ON_LOG, listener)
    return () => ipcRenderer.removeListener(LOG_CHANNELS.ON_LOG, listener)
  },
  rendererLog: (level: string, source: string, message: string): void => {
    ipcRenderer.invoke(LOG_CHANNELS.RENDERER_LOG, level, source, message)
  }
}

const translateApi = {
  translate: (text: string): Promise<string> =>
    ipcRenderer.invoke(TRANSLATE_CHANNELS.TRANSLATE, text),
  define: (text: string, rephrase: boolean): Promise<string> =>
    ipcRenderer.invoke(TRANSLATE_CHANNELS.DEFINE, text, rephrase),
  summarize: (text: string): Promise<{ summary: string; streamId: string; sampleRate: number }> =>
    ipcRenderer.invoke(TRANSLATE_CHANNELS.SUMMARIZE, text)
}

// Per-stream TTS dispatch: single IPC listener, O(1) lookup per event
type TtsStreamEvent = { type: 'chunk'; data: string } | { type: 'done' } | { type: 'error'; message: string }
const ttsStreamListeners = new Map<string, (event: TtsStreamEvent) => void>()

ipcRenderer.on(TTS_CHANNELS.STREAM, (_event, streamId: string, data: TtsStreamEvent) => {
  ttsStreamListeners.get(streamId)?.(data)
  if (data.type === 'done' || data.type === 'error') {
    ttsStreamListeners.delete(streamId)
  }
})

const ttsApi = {
  speak: (text: string): Promise<{ streamId: string; sampleRate: number }> =>
    ipcRenderer.invoke(TTS_CHANNELS.SPEAK, text),
  onStream: (streamId: string, cb: (event: TtsStreamEvent) => void): (() => void) => {
    ttsStreamListeners.set(streamId, cb)
    return () => { ttsStreamListeners.delete(streamId) }
  }
}

const sysmonApi = {
  getMetrics: (): Promise<SystemMetrics> =>
    ipcRenderer.invoke(SYSMON_CHANNELS.METRICS)
}

const gitApi = {
  getInfo: (cwd: string): Promise<{ repo: string; branch: string; url: string | null } | null> =>
    ipcRenderer.invoke(GIT_CHANNELS.GET_INFO, cwd),
  listBranches: (cwd: string): Promise<{ name: string; current: boolean; isRemote: boolean }[]> =>
    ipcRenderer.invoke(GIT_CHANNELS.LIST_BRANCHES, cwd),
  checkout: (cwd: string, branch: string): Promise<void> =>
    ipcRenderer.invoke(GIT_CHANNELS.CHECKOUT, cwd, branch),
  createBranch: (cwd: string, name: string): Promise<void> =>
    ipcRenderer.invoke(GIT_CHANNELS.CREATE_BRANCH, cwd, name)
}

const sshApi = {
  connect: (profileId: string): Promise<void> =>
    ipcRenderer.invoke(SSH_CHANNELS.CONNECT, profileId),
  disconnect: (profileId: string): Promise<void> =>
    ipcRenderer.invoke(SSH_CHANNELS.DISCONNECT, profileId),
  readDir: (profileId: string, remotePath: string): Promise<FileEntry[]> =>
    ipcRenderer.invoke(SSH_CHANNELS.READ_DIR, profileId, remotePath),
  getHomeDir: (profileId: string): Promise<string> =>
    ipcRenderer.invoke(SSH_CHANNELS.GET_HOME_DIR, profileId)
}

const selfmonApi = {
  getMetrics: (): Promise<SelfMetrics> =>
    ipcRenderer.invoke(SELFMON_CHANNELS.METRICS)
}

const shareApi = {
  start: (ptyId: string): Promise<ShareSessionInfo> =>
    ipcRenderer.invoke(SHARE_CHANNELS.START, ptyId),
  stop: (sessionId: string): Promise<void> =>
    ipcRenderer.invoke(SHARE_CHANNELS.STOP, sessionId),
  status: (sessionId: string): Promise<ShareSessionInfo | null> =>
    ipcRenderer.invoke(SHARE_CHANNELS.STATUS, sessionId)
}

const zoomApi = {
  setFactor: (factor: number): void => { webFrame.setZoomFactor(factor) },
  getFactor: (): number => webFrame.getZoomFactor()
}

contextBridge.exposeInMainWorld('api', {
  pty: ptyApi,
  fs: fsApi,
  settings: settingsApi,
  session: sessionApi,
  shell: shellApi,
  clipboard: clipboardApi,
  window: windowApi,
  whisper: whisperApi,
  log: logApi,
  ssh: sshApi,
  translate: translateApi,
  tts: ttsApi,
  sysmon: sysmonApi,
  selfmon: selfmonApi,
  git: gitApi,
  share: shareApi,
  zoom: zoomApi
})
