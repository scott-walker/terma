import { ipcMain, BrowserWindow } from 'electron'
import { nanoid } from 'nanoid'
import { PTY_CHANNELS, FS_CHANNELS } from '../../shared/channels'
import { PtyManager, PtyCreateOpts } from '../pty/pty-manager'
import { FsService } from '../file-system/fs-service'
import { FsWatcher } from '../file-system/fs-watcher'

export function registerIpcHandlers(
  ptyManager: PtyManager,
  fsService: FsService,
  fsWatcher: FsWatcher
): void {
  // PTY handlers
  ipcMain.handle(PTY_CHANNELS.CREATE, (event, opts: PtyCreateOpts) => {
    const id = nanoid()
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No window found')
    ptyManager.create(id, win, opts)
    return id
  })

  ipcMain.on(PTY_CHANNELS.WRITE, (_event, id: string, data: string) => {
    ptyManager.write(id, data)
  })

  ipcMain.on(PTY_CHANNELS.RESIZE, (_event, id: string, cols: number, rows: number) => {
    ptyManager.resize(id, cols, rows)
  })

  ipcMain.on(PTY_CHANNELS.DESTROY, (_event, id: string) => {
    ptyManager.destroy(id)
  })

  ipcMain.handle(PTY_CHANNELS.GET_CWD, (_event, id: string) => {
    return ptyManager.getCwd(id)
  })

  // FS handlers
  ipcMain.handle(FS_CHANNELS.READ_DIR, (_event, dirPath: string) => {
    return fsService.readDir(dirPath)
  })

  ipcMain.handle(FS_CHANNELS.STAT, (_event, filePath: string) => {
    return fsService.stat(filePath)
  })

  ipcMain.handle(FS_CHANNELS.RENAME, (_event, oldPath: string, newPath: string) => {
    return fsService.rename(oldPath, newPath)
  })

  ipcMain.handle(FS_CHANNELS.DELETE, (_event, filePath: string) => {
    return fsService.delete(filePath)
  })

  ipcMain.handle(FS_CHANNELS.COPY, (event, srcPath: string, destDir: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return fsService.copy(srcPath, destDir, (done, total) => {
      if (win) win.webContents.send(FS_CHANNELS.COPY_PROGRESS, { done, total })
    })
  })

  ipcMain.on(FS_CHANNELS.WATCH, (event, dirPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) fsWatcher.watch(dirPath, win)
  })

  ipcMain.on(FS_CHANNELS.UNWATCH, (_event, dirPath: string) => {
    fsWatcher.unwatch(dirPath)
  })
}
