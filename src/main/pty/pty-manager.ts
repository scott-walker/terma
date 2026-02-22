import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { PTY_CHANNELS } from '../../shared/channels'
import type { PtyCreateOpts } from '../../shared/types'
import type { PlatformService } from '../services/platform-service'
import { logger } from '../services/logger-service'

export class PtyManager {
  private sessions = new Map<string, pty.IPty>()
  private platform: PlatformService

  constructor(platform: PlatformService) {
    this.platform = platform
  }

  private get shell(): string {
    return process.platform === 'win32'
      ? process.env.COMSPEC || 'powershell.exe'
      : process.env.SHELL || '/bin/bash'
  }

  create(id: string, win: BrowserWindow, opts: PtyCreateOpts = {}): void {
    const term = pty.spawn(opts.command || this.shell, opts.args || [], {
      name: 'xterm-256color',
      cols: opts.cols || 80,
      rows: opts.rows || 24,
      cwd: opts.cwd || process.env.HOME || '/',
      env: process.env as Record<string, string>
    })

    this.sessions.set(id, term)
    logger.info('pty', `PTY created: ${id} (pid=${term.pid})`)

    term.onData((data) => {
      if (!win.isDestroyed()) {
        win.webContents.send(PTY_CHANNELS.DATA, id, data)
      }
    })

    term.onExit(({ exitCode, signal }) => {
      this.sessions.delete(id)
      if (!win.isDestroyed()) {
        win.webContents.send(PTY_CHANNELS.EXIT, id, exitCode, signal)
      }
    })
  }

  write(id: string, data: string): void {
    this.sessions.get(id)?.write(data)
  }

  resize(id: string, cols: number, rows: number): void {
    try {
      this.sessions.get(id)?.resize(cols, rows)
    } catch (err) {
      logger.warn('pty', `Resize failed for ${id}`, err)
    }
  }

  destroy(id: string): void {
    const term = this.sessions.get(id)
    if (term) {
      term.kill()
      this.sessions.delete(id)
      logger.info('pty', `PTY destroyed: ${id}`)
    }
  }

  getCwd(id: string): string | null {
    const term = this.sessions.get(id)
    if (!term) return null
    return this.platform.getCwd(term.pid)
  }

  destroyAll(): void {
    for (const [id] of this.sessions) {
      this.destroy(id)
    }
  }
}
