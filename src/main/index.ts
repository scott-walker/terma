import { app, BrowserWindow, clipboard, ipcMain, shell } from 'electron'
import { spawn } from 'child_process'
import { join } from 'path'
import { writeFile, access } from 'fs/promises'
import { WINDOW_CHANNELS, CLIPBOARD_CHANNELS, SHELL_CHANNELS } from '../shared/channels'
import { PtyManager } from './pty/pty-manager'
import { FsService } from './file-system/fs-service'
import { FsWatcher } from './file-system/fs-watcher'
import { registerIpcHandlers } from './ipc/handlers'
import { registerSettingsHandlers } from './ipc/settings-handlers'
import { registerSessionHandlers } from './ipc/session-handlers'
import { registerWhisperHandlers } from './ipc/whisper-handlers'
import { registerLogHandlers } from './ipc/log-handlers'
import { logger } from './services/logger-service'
import { createPlatformService } from './services/platform-service'

app.commandLine.appendSwitch('no-sandbox')
app.setName('terma')
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('class', 'terma')
  app.commandLine.appendSwitch('ozone-platform-hint', 'auto')
}

const platform = createPlatformService()
const ptyManager = new PtyManager(platform)
const fsService = new FsService()
const fsWatcher = new FsWatcher()

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 400,
    minHeight: 300,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#191c24',
    icon: app.isPackaged
      ? join(process.resourcesPath, 'icon-256.png')
      : join(__dirname, '../../assets/icon-256.png'),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  // Block native Electron zoom — zoom is handled in renderer via settings
  win.webContents.on('before-input-event', (_event, input) => {
    if (
      input.control &&
      !input.shift &&
      !input.alt &&
      (input.key === '=' || input.key === '+' || input.key === '-' || input.key === '0')
    ) {
      // Let the renderer handle these keys for custom zoom
    }
  })
  win.webContents.setZoomFactor(1)
  win.webContents.setVisualZoomLevelLimits(1, 1)

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

app.whenReady().then(() => {
  registerIpcHandlers(ptyManager, fsService, fsWatcher, platform)
  registerSettingsHandlers()
  registerSessionHandlers()
  registerWhisperHandlers()
  registerLogHandlers()

  logger.info('app', 'App ready')

  ipcMain.handle(CLIPBOARD_CHANNELS.READ_FILE_PATHS, () => {
    return platform.getClipboardFilePaths()
  })

  ipcMain.handle(CLIPBOARD_CHANNELS.SAVE_IMAGE, async (_event, destDir: string) => {
    const img = clipboard.readImage()
    if (img.isEmpty()) return null
    const png = img.toPNG()
    const now = new Date()
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0')
    ].join('')
    const baseName = `image_${ts}`
    let filePath = join(destDir, `${baseName}.png`)
    let counter = 0
    while (true) {
      try {
        await access(filePath)
        counter++
        filePath = join(destDir, `${baseName} (${counter}).png`)
      } catch {
        break
      }
    }
    await writeFile(filePath, png)
    return filePath
  })

  ipcMain.handle(SHELL_CHANNELS.OPEN_PATH, (_event, path: string) => shell.openPath(path))
  ipcMain.handle(SHELL_CHANNELS.OPEN_WITH, (_event, command: string, filePath: string) => {
    spawn(command, [filePath], { detached: true, stdio: 'ignore' }).unref()
  })

  ipcMain.on(WINDOW_CHANNELS.MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on(WINDOW_CHANNELS.MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.on(WINDOW_CHANNELS.CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
  ipcMain.handle(WINDOW_CHANNELS.IS_MAXIMIZED, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  const mainWin = createWindow()
  logger.info('app', 'Window created')
  mainWin.on('maximize', () => mainWin.webContents.send(WINDOW_CHANNELS.MAXIMIZED_CHANGE, true))
  mainWin.on('unmaximize', () => mainWin.webContents.send(WINDOW_CHANNELS.MAXIMIZED_CHANGE, false))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  logger.info('app', 'All windows closed')
  ptyManager.destroyAll()
  fsWatcher.unwatchAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  logger.info('app', 'Quitting')
  ptyManager.destroyAll()
  fsWatcher.unwatchAll()
})
