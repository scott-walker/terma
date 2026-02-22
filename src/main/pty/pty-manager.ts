import * as pty from 'node-pty'
import { BrowserWindow } from 'electron'
import { homedir } from 'os'
import { PTY_CHANNELS } from '../../shared/channels'
import type { PtyCreateOpts } from '../../shared/types'
import type { PlatformService } from '../services/platform-service'
import { logger } from '../services/logger-service'

export class PtyManager {
  private sessions = new Map<string, pty.IPty>()
  private disposables = new Map<string, pty.IDisposable[]>()
  private platform: PlatformService

  constructor(platform: PlatformService) {
    this.platform = platform
  }

  get sessionCount(): number {
    return this.sessions.size
  }

  private get shell(): string {
    return process.platform === 'win32'
      ? process.env.COMSPEC || 'powershell.exe'
      : process.env.SHELL || '/bin/bash'
  }

  private get defaultShellArgs(): string[] {
    if (process.platform === 'win32') return []
    return ['--login']
  }

  create(id: string, win: BrowserWindow, opts: PtyCreateOpts = {}): void {
    const isDefaultShell = !opts.command
    const term = pty.spawn(opts.command || this.shell, opts.args || (isDefaultShell ? this.defaultShellArgs : []), {
      name: 'xterm-256color',
      cols: opts.cols || 80,
      rows: opts.rows || 24,
      cwd: opts.cwd || homedir(),
      env: process.env as Record<string, string>
    })

    this.sessions.set(id, term)
    logger.info('pty', `PTY created: ${id} (pid=${term.pid})`)

    const d1 = term.onData((data) => {
      if (!win.isDestroyed()) {
        win.webContents.send(PTY_CHANNELS.DATA, id, data)
      }
    })

    const d2 = term.onExit(({ exitCode, signal }) => {
      this.dispose(id)
      if (!win.isDestroyed()) {
        win.webContents.send(PTY_CHANNELS.EXIT, id, exitCode, signal)
      }
    })

    this.disposables.set(id, [d1, d2])
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

  private dispose(id: string): void {
    const subs = this.disposables.get(id)
    if (subs) {
      for (const d of subs) d.dispose()
      this.disposables.delete(id)
    }
    this.sessions.delete(id)
  }

  destroy(id: string): void {
    const term = this.sessions.get(id)
    if (term) {
      this.dispose(id)
      term.kill()
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
