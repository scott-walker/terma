import { ipcMain, BrowserWindow, shell, type IpcMainInvokeEvent } from 'electron'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { nanoid } from 'nanoid'
import { PTY_CHANNELS, FS_CHANNELS, GIT_CHANNELS } from '../../shared/channels'
import type { IpcInvokeMap, IpcSendMap } from '../../shared/ipc-types'
import type { PtyCreateOpts } from '../../shared/types'
import type { PlatformService } from '../services/platform-service'
import { logger } from '../services/logger-service'
import { PtyManager } from '../pty/pty-manager'
import { FsService } from '../file-system/fs-service'
import { FsWatcher } from '../file-system/fs-watcher'
import { getGitInfo, listBranches, checkoutBranch, createBranch } from '../services/git-service'

/** Typed ipcMain.handle — enforces arg/return types from IpcInvokeMap */
export function typedHandle<C extends keyof IpcInvokeMap>(
  channel: C,
  fn: (event: IpcMainInvokeEvent, ...args: IpcInvokeMap[C][0]) => IpcInvokeMap[C][1] | Promise<IpcInvokeMap[C][1]>
): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]) => {
    try {
      return await (fn as (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown)(event, ...args)
    } catch (err) {
      logger.error('ipc', `Handler error [${channel}]`, err instanceof Error ? err.message : err)
      throw err
    }
  })
}

/** Typed ipcMain.on — enforces arg types from IpcSendMap */
export function typedOn<C extends keyof IpcSendMap>(
  channel: C,
  fn: (event: Electron.IpcMainEvent, ...args: IpcSendMap[C]) => void
): void {
  ipcMain.on(channel, (event, ...args: unknown[]) => {
    try {
      ;(fn as (event: Electron.IpcMainEvent, ...args: unknown[]) => void)(event, ...args)
    } catch (err) {
      logger.error('ipc', `Send handler error [${channel}]`, err instanceof Error ? err.message : err)
    }
  })
}

export function registerIpcHandlers(
  ptyManager: PtyManager,
  fsService: FsService,
  fsWatcher: FsWatcher,
  platform: PlatformService
): void {
  // PTY handlers
  typedHandle(PTY_CHANNELS.CREATE, (event, opts?: PtyCreateOpts) => {
    const id = nanoid()
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) throw new Error('No window found')
    ptyManager.create(id, win, opts)
    return id
  })

  typedOn(PTY_CHANNELS.WRITE, (_event, id: string, data: string) => {
    ptyManager.write(id, data)
  })

  typedOn(PTY_CHANNELS.RESIZE, (_event, id: string, cols: number, rows: number) => {
    ptyManager.resize(id, cols, rows)
  })

  typedOn(PTY_CHANNELS.DESTROY, (_event, id: string) => {
    ptyManager.destroy(id)
  })

  typedHandle(PTY_CHANNELS.GET_CWD, (_event, id: string) => {
    return ptyManager.getCwd(id)
  })

  // FS handlers
  typedHandle(FS_CHANNELS.READ_FILE, (_event, filePath: string) =>
    readFile(filePath, 'utf-8')
  )

  const MIME_MAP: Record<string, string> = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.gif': 'image/gif', '.webp': 'image/webp', '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp', '.ico': 'image/x-icon', '.avif': 'image/avif'
  }

  typedHandle(FS_CHANNELS.READ_FILE_DATA_URL, async (_event, filePath: string) => {
    const ext = extname(filePath).toLowerCase()
    const mime = MIME_MAP[ext] || 'application/octet-stream'
    const buffer = await readFile(filePath)
    return `data:${mime};base64,${buffer.toString('base64')}`
  })

  typedHandle(FS_CHANNELS.READ_DIR, (_event, dirPath: string) => {
    return fsService.readDir(dirPath)
  })

  typedHandle(FS_CHANNELS.STAT, (_event, filePath: string) => {
    return fsService.stat(filePath)
  })

  typedHandle(FS_CHANNELS.RENAME, (_event, oldPath: string, newPath: string) => {
    return fsService.rename(oldPath, newPath)
  })

  typedHandle(FS_CHANNELS.DELETE, (_event, filePath: string) => {
    return shell.trashItem(filePath)
  })

  typedHandle(FS_CHANNELS.RESTORE, (_event, originalPaths: string[]) => {
    return platform.restoreFromTrash(originalPaths)
  })

  typedHandle(FS_CHANNELS.SEARCH_FILES, (_event, rootDir: string, query: string) => {
    return fsService.searchFiles(rootDir, query)
  })

  typedHandle(FS_CHANNELS.COPY, (event, srcPath: string, destDir: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    return fsService.copy(srcPath, destDir, (done, total) => {
      if (win) win.webContents.send(FS_CHANNELS.COPY_PROGRESS, { done, total })
    })
  })

  // Git handlers
  typedHandle(GIT_CHANNELS.GET_INFO, (_event, cwd: string) => {
    return getGitInfo(cwd)
  })

  typedHandle(GIT_CHANNELS.LIST_BRANCHES, (_event, cwd: string) => {
    return listBranches(cwd)
  })

  typedHandle(GIT_CHANNELS.CHECKOUT, (_event, cwd: string, branch: string) => {
    return checkoutBranch(cwd, branch)
  })

  typedHandle(GIT_CHANNELS.CREATE_BRANCH, (_event, cwd: string, name: string) => {
    return createBranch(cwd, name)
  })

  typedOn(FS_CHANNELS.WATCH, (event, dirPath: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) fsWatcher.watch(dirPath, win)
  })

  typedOn(FS_CHANNELS.UNWATCH, (_event, dirPath: string) => {
    fsWatcher.unwatch(dirPath)
  })
}
