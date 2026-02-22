import { watch, FSWatcher } from 'chokidar'
import { BrowserWindow } from 'electron'
import { FS_CHANNELS } from '../../shared/channels'
import { logger } from '../services/logger-service'

export class FsWatcher {
  private watchers = new Map<string, FSWatcher>()

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

    this.watchers.set(dirPath, watcher)
  }

  unwatch(dirPath: string): void {
    const watcher = this.watchers.get(dirPath)
    if (watcher) {
      logger.debug('fs-watcher', `Unwatching: ${dirPath}`)
      watcher.close()
      this.watchers.delete(dirPath)
    }
  }

  unwatchAll(): void {
    for (const [, watcher] of this.watchers) {
      watcher.close()
    }
    this.watchers.clear()
  }
}
