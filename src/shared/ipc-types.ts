/**
 * Typed IPC contract — single source of truth for main ↔ renderer communication.
 *
 * IpcInvokeMap: channels using ipcMain.handle / ipcRenderer.invoke
 *   key = channel string, value = [argsTuple, returnType]
 *
 * IpcSendMap: channels using ipcMain.on / ipcRenderer.send (fire-and-forget)
 *   key = channel string, value = argsTuple
 */

import type { FileEntry, PtyCreateOpts, SessionState, LogEntry, SystemMetrics, SelfMetrics } from './types'
import type { TerminalSettings } from './settings'

// ── invoke/handle channels (request → response) ──

export interface IpcInvokeMap {
  // PTY
  'pty:create': [args: [opts?: PtyCreateOpts], ret: string]
  'pty:getCwd': [args: [id: string], ret: string | null]

  // FS
  'fs:readDir': [args: [dirPath: string], ret: FileEntry[]]
  'fs:readFile': [args: [filePath: string], ret: string]
  'fs:readFileDataUrl': [args: [filePath: string], ret: string]
  'fs:stat': [args: [filePath: string], ret: FileEntry]
  'fs:rename': [args: [oldPath: string, newPath: string], ret: void]
  'fs:delete': [args: [filePath: string], ret: void]
  'fs:restore': [args: [originalPaths: string[]], ret: { ok: number; fail: number }]
  'fs:copy': [args: [srcPath: string, destDir: string], ret: void]
  'fs:searchFiles': [args: [rootDir: string, query: string], ret: FileEntry[]]

  // Settings
  'settings:get': [args: [], ret: TerminalSettings]
  'settings:update': [args: [partial: Partial<TerminalSettings>], ret: TerminalSettings]
  'settings:reset': [args: [], ret: TerminalSettings]

  // Session
  'session:save': [args: [state: SessionState], ret: void]
  'session:load': [args: [], ret: SessionState | null]

  // Shell
  'shell:openPath': [args: [path: string], ret: string]
  'shell:openWith': [args: [command: string, filePath: string], ret: void]

  // Clipboard
  'clipboard:readFilePaths': [args: [], ret: string[]]
  'clipboard:writeFilePaths': [args: [paths: string[]], ret: void]
  'clipboard:saveImage': [args: [destDir: string], ret: string | null]

  // Window
  'window:isMaximized': [args: [], ret: boolean]

  // Whisper
  'whisper:transcribe': [args: [audioBuffer: ArrayBuffer], ret: string]

  // Log
  'log:getLogs': [args: [], ret: LogEntry[]]

  // Translate
  'translate:translate': [args: [text: string], ret: string]

  // TTS (ElevenLabs) — streaming PCM audio
  'tts:speak': [args: [text: string], ret: { streamId: string; sampleRate: number }]

  // System monitor
  'sysmon:metrics': [args: [], ret: SystemMetrics]

  // Self-monitoring (app resource usage)
  'selfmon:metrics': [args: [], ret: SelfMetrics]

  // Git
  'git:getInfo': [args: [cwd: string], ret: { repo: string; branch: string; url: string | null } | null]
  'git:listBranches': [args: [cwd: string], ret: { name: string; current: boolean; isRemote: boolean }[]]
  'git:checkout': [args: [cwd: string, branch: string], ret: void]
  'git:createBranch': [args: [cwd: string, name: string], ret: void]

  // SSH
  'ssh:connect': [args: [profileId: string], ret: void]
  'ssh:disconnect': [args: [profileId: string], ret: void]
  'ssh:readDir': [args: [profileId: string, remotePath: string], ret: FileEntry[]]
  'ssh:getHomeDir': [args: [profileId: string], ret: string]
}

// ── send/on channels (fire-and-forget) ──

export interface IpcSendMap {
  // PTY
  'pty:write': [id: string, data: string]
  'pty:resize': [id: string, cols: number, rows: number]
  'pty:destroy': [id: string]

  // FS
  'fs:watch': [dirPath: string]
  'fs:unwatch': [dirPath: string]

  // Window
  'window:minimize': []
  'window:maximize': []
  'window:close': []
  'window:force-close': []
}

// ── Events: main → renderer (webContents.send / ipcRenderer.on) ──

export interface IpcEventMap {
  // PTY
  'pty:data': [id: string, data: string]
  'pty:exit': [id: string, exitCode: number, signal: number]

  // FS
  'fs:copyProgress': [progress: { done: number; total: number }]
  'fs:event': [data: { event: string; path: string; dirPath: string }]

  // Settings
  'settings:changed': [settings: TerminalSettings]

  // Window
  'window:maximized-change': [maximized: boolean]
  'window:confirm-close': []

  // TTS
  'tts:stream': [streamId: string, event: { type: 'chunk'; data: string } | { type: 'done' } | { type: 'error'; message: string }]

  // Log
  'log:onLog': [entry: LogEntry]
}

// ── Helper types for extracting args/return from the map ──

export type InvokeArgs<C extends keyof IpcInvokeMap> = IpcInvokeMap[C][0]
export type InvokeReturn<C extends keyof IpcInvokeMap> = IpcInvokeMap[C][1]
export type SendArgs<C extends keyof IpcSendMap> = IpcSendMap[C]
