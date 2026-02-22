import { watch, FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { FS_CHANNELS } from '../../shared/channels'
import { logger } from '../services/logger-service'

interface WatcherEntry {
  watcher: FSWatcher
  winId: number
}

export class FsWatcher {
  private watchers = new Map<string, WatcherEntry>()
  private winCleanups = new Map<number, () => void>()

  watch(dirPath: string, win: BrowserWindow): void {
    if (this.watchers.has(dirPath)) return
    logger.debug('fs-watcher', `Watching: ${dirPath}`)

    const watcher = watch(dirPath, {
      depth: 0,
      ignoreInitial: true,
      ignorePermissionErrors: true
    })

    watcher.on('all', (event, path) => {
      if (!win.isDestroyed()) {
        win.webContents.send(FS_CHANNELS.FS_EVENT, { event, path, dirPath })
      }
    })

    this.watchers.set(dirPath, { watcher, winId: win.id })
    this.ensureWinCleanup(win)
  }

  unwatch(dirPath: string): void {
    const entry = this.watchers.get(dirPath)
    if (entry) {
      logger.debug('fs-watcher', `Unwatching: ${dirPath}`)
      entry.watcher.close()
      this.watchers.delete(dirPath)
    }
  }

  unwatchAll(): void {
    for (const [, entry] of this.watchers) {
      entry.watcher.close()
    }
    this.watchers.clear()
  }

  /** Register a one-time cleanup for all watchers bound to this window */
  private ensureWinCleanup(win: BrowserWindow): void {
    if (this.winCleanups.has(win.id)) return

    const cleanup = (): void => {
      this.winCleanups.delete(win.id)
      const toRemove: string[] = []
      for (const [dirPath, entry] of this.watchers) {
        if (entry.winId === win.id) {
          entry.watcher.close()
          toRemove.push(dirPath)
        }
      }
      for (const p of toRemove) this.watchers.delete(p)
      if (toRemove.length > 0) {
        logger.debug('fs-watcher', `Cleaned up ${toRemove.length} watchers for closed window`)
      }
    }

    win.once('closed', cleanup)
    this.winCleanups.set(win.id, cleanup)
  }
}
