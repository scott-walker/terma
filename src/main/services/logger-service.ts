import { BrowserWindow } from 'electron'
import { LOG_CHANNELS } from '../../shared/channels'
import type { LogLevel, LogEntry } from '../../shared/types'

const MAX_ENTRIES = 500
const BROADCAST_LEVELS: Set<LogLevel> = new Set(['info', 'warn', 'error'])

class LoggerService {
  private entries: LogEntry[] = []

  private log(level: LogLevel, source: string, message: string, data?: unknown): void {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      source,
      message,
      ...(data !== undefined && { data })
    }

    this.entries.push(entry)
    if (this.entries.length > MAX_ENTRIES) {
      this.entries.shift()
    }

    // Console output for dev (may throw EIO if stdout pipe is broken)
    try {
      const prefix = `[${level.toUpperCase()}] [${source}]`
      if (level === 'error') {
        console.error(prefix, message, data ?? '')
      } else if (level === 'warn') {
        console.warn(prefix, message, data ?? '')
      } else {
        console.log(prefix, message, data ?? '')
      }
    } catch {
      // stdout/stderr broken — ignore silently
    }

    // Broadcast to renderer — skip debug to reduce IPC traffic
    if (BROADCAST_LEVELS.has(level)) {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) {
          win.webContents.send(LOG_CHANNELS.ON_LOG, entry)
        }
      }
    }
  }

  debug(source: string, message: string, data?: unknown): void {
    this.log('debug', source, message, data)
  }

  info(source: string, message: string, data?: unknown): void {
    this.log('info', source, message, data)
  }

  warn(source: string, message: string, data?: unknown): void {
    this.log('warn', source, message, data)
  }

  error(source: string, message: string, data?: unknown): void {
    this.log('error', source, message, data)
  }

  getEntries(): LogEntry[] {
    return [...this.entries]
  }
}

export const logger = new LoggerService()
