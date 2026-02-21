import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { PtyManager } from './pty/pty-manager'
import { FsService } from './file-system/fs-service'
import { FsWatcher } from './file-system/fs-watcher'
import { registerIpcHandlers } from './ipc/handlers'
import { registerSettingsHandlers } from './ipc/settings-handlers'

app.commandLine.appendSwitch('no-sandbox')

const ptyManager = new PtyManager()
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
  registerIpcHandlers(ptyManager, fsService, fsWatcher)
  registerSettingsHandlers()

  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  ipcMain.on('window:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  ptyManager.destroyAll()
  fsWatcher.unwatchAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  ptyManager.destroyAll()
  fsWatcher.unwatchAll()
})
