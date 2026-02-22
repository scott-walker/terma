import * as pty from 'node-pty'
import { readlinkSync } from 'fs'
import { BrowserWindow } from 'electron'
import { PTY_CHANNELS } from '../../shared/channels'

export interface PtyCreateOpts {
  cols?: number
  rows?: number
  cwd?: string
  command?: string
  args?: string[]
}

export class PtyManager {
  private sessions = new Map<string, pty.IPty>()

  private get shell(): string {
    return process.env.SHELL || '/bin/bash'
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
    } catch {
      // Ignore resize errors (can happen during rapid resize)
    }
  }

  destroy(id: string): void {
    const term = this.sessions.get(id)
    if (term) {
      term.kill()
      this.sessions.delete(id)
    }
  }

  getCwd(id: string): string | null {
    const term = this.sessions.get(id)
    if (!term) return null
    try {
      return readlinkSync(`/proc/${term.pid}/cwd`).toString()
    } catch {
      return null
    }
  }

  destroyAll(): void {
    for (const [id] of this.sessions) {
      this.destroy(id)
    }
  }
}
