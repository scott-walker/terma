import { ipcMain, BrowserWindow, shell } from 'electron'
import { nanoid } from 'nanoid'
import { readdir, readFile, rename, rm, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { homedir } from 'os'
import { PTY_CHANNELS, FS_CHANNELS } from '../../shared/channels'
import { PtyManager, PtyCreateOpts } from '../pty/pty-manager'
import { FsService } from '../file-system/fs-service'
import { FsWatcher } from '../file-system/fs-watcher'

async function restoreFromTrash(
  originalPaths: string[]
): Promise<{ ok: number; fail: number }> {
  const trashBase = join(homedir(), '.local/share/Trash')
  const infoDir = join(trashBase, 'info')
  const filesDir = join(trashBase, 'files')

  let infoFiles: string[]
  try {
    infoFiles = (await readdir(infoDir)).filter((f) => f.endsWith('.trashinfo'))
  } catch {
    return { ok: 0, fail: originalPaths.length }
  }

  // Build a map: originalPath → best (most recent) trashinfo entry
  const trashMap = new Map<string, { trashName: string; date: number }>()
  for (const infoFile of infoFiles) {
    try {
      const content = await readFile(join(infoDir, infoFile), 'utf-8')
      const pathMatch = content.match(/Path=(.+)/)
      if (!pathMatch) continue
      const trashedPath = decodeURIComponent(pathMatch[1].trim())
      if (!originalPaths.includes(trashedPath)) continue

      const dateMatch = content.match(/DeletionDate=(.+)/)
      const date = dateMatch ? new Date(dateMatch[1].trim()).getTime() : 0
      const trashName = infoFile.replace(/\.trashinfo$/, '')

      const existing = trashMap.get(trashedPath)
      if (!existing || date > existing.date) {
        trashMap.set(trashedPath, { trashName, date })
      }
    } catch {
      // skip unreadable trashinfo
    }
  }

  let ok = 0
  let fail = 0

  for (const originalPath of originalPaths) {
    const entry = trashMap.get(originalPath)
    if (!entry) {
      fail++
      continue
    }
    try {
      const trashedFilePath = join(filesDir, entry.trashName)
      await mkdir(dirname(originalPath), { recursive: true })
      await rename(trashedFilePath, originalPath)
      await rm(join(infoDir, `${entry.trashName}.trashinfo`))
      ok++
    } catch {
      fail++
    }
  }

  return { ok, fail }
}

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
    return shell.trashItem(filePath)
  })

  ipcMain.handle(
    FS_CHANNELS.RESTORE,
    (_event, originalPaths: string[]) => {
      return restoreFromTrash(originalPaths)
    }
  )

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
