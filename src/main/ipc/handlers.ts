import { ipcMain, BrowserWindow, shell, type IpcMainInvokeEvent } from 'electron'
import { nanoid } from 'nanoid'
import { PTY_CHANNELS, FS_CHANNELS } from '../../shared/channels'
import type { PtyCreateOpts } from '../../shared/types'
import type { PlatformService } from '../services/platform-service'
import { logger } from '../services/logger-service'
import { PtyManager } from '../pty/pty-manager'
import { FsService } from '../file-system/fs-service'
import { FsWatcher } from '../file-system/fs-watcher'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerFn = (event: IpcMainInvokeEvent, ...args: any[]) => any

export function wrapHandler(channel: string, fn: HandlerFn): HandlerFn {
  return async (event, ...args) => {
    try {
      return await fn(event, ...args)
    } catch (err) {
      logger.error('ipc', `Handler error [${channel}]`, err instanceof Error ? err.message : err)
      throw err
    }
  }
}

export function registerIpcHandlers(
  ptyManager: PtyManager,
  fsService: FsService,
  fsWatcher: FsWatcher,
  platform: PlatformService
): void {
  // PTY handlers
  ipcMain.handle(PTY_CHANNELS.CREATE, wrapHandler(PTY_CHANNELS.CREATE, (event, opts: PtyCreateOpts) => {
    const id = nanoid()
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No window found')
    ptyManager.create(id, win, opts)
    return id
  }))

  ipcMain.on(PTY_CHANNELS.WRITE, (_event, id: string, data: string) => {
    ptyManager.write(id, data)
  })

  ipcMain.on(PTY_CHANNELS.RESIZE, (_event, id: string, cols: number, rows: number) => {
    ptyManager.resize(id, cols, rows)
  })

  ipcMain.on(PTY_CHANNELS.DESTROY, (_event, id: string) => {
    ptyManager.destroy(id)
  })

  ipcMain.handle(PTY_CHANNELS.GET_CWD, wrapHandler(PTY_CHANNELS.GET_CWD, (_event, id: string) => {
    return ptyManager.getCwd(id)
  }))

  // FS handlers
  ipcMain.handle(FS_CHANNELS.READ_DIR, wrapHandler(FS_CHANNELS.READ_DIR, (_event, dirPath: string) => {
    return fsService.readDir(dirPath)
  }))

  ipcMain.handle(FS_CHANNELS.STAT, wrapHandler(FS_CHANNELS.STAT, (_event, filePath: string) => {
    return fsService.stat(filePath)
  }))

  ipcMain.handle(FS_CHANNELS.RENAME, wrapHandler(FS_CHANNELS.RENAME, (_event, oldPath: string, newPath: string) => {
    return fsService.rename(oldPath, newPath)
  }))

  ipcMain.handle(FS_CHANNELS.DELETE, wrapHandler(FS_CHANNELS.DELETE, (_event, filePath: string) => {
    return shell.trashItem(filePath)
  }))

  ipcMain.handle(FS_CHANNELS.RESTORE, wrapHandler(FS_CHANNELS.RESTORE, (_event, originalPaths: string[]) => {
    return platform.restoreFromTrash(originalPaths)
  }))

  ipcMain.handle(FS_CHANNELS.COPY, wrapHandler(FS_CHANNELS.COPY, (event, srcPath: string, destDir: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return fsService.copy(srcPath, destDir, (done, total) => {
      if (win) win.webContents.send(FS_CHANNELS.COPY_PROGRESS, { done, total })
    })
  }))

  ipcMain.on(FS_CHANNELS.WATCH, (event, dirPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) fsWatcher.watch(dirPath, win)
  })

  ipcMain.on(FS_CHANNELS.UNWATCH, (_event, dirPath: string) => {
    fsWatcher.unwatch(dirPath)
  })
}
