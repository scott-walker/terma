import { app, BrowserWindow, clipboard, shell } from 'electron'
import { spawn } from 'child_process'
import { join } from 'path'
import { writeFile, access } from 'fs/promises'
import { WINDOW_CHANNELS, CLIPBOARD_CHANNELS, SHELL_CHANNELS, SELFMON_CHANNELS } from '../shared/channels'
import { PtyManager } from './pty/pty-manager'
import { FsService } from './file-system/fs-service'
import { FsWatcher } from './file-system/fs-watcher'
import { registerIpcHandlers, typedHandle, typedOn } from './ipc/handlers'
import { registerSettingsHandlers } from './ipc/settings-handlers'
import { registerSessionHandlers } from './ipc/session-handlers'
import { registerWhisperHandlers } from './ipc/whisper-handlers'
import { registerLogHandlers } from './ipc/log-handlers'
import { registerSshHandlers } from './ipc/ssh-handlers'
import { registerTranslateHandlers } from './ipc/translate-handlers'
import { registerSysmonHandlers } from './ipc/sysmon-handlers'
import { SshService } from './ssh/ssh-service'
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
const sshService = new SshService()

// CPU tracking for self-monitoring
let lastCpuUsage = process.cpuUsage()
let lastCpuTime = Date.now()

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
  registerSshHandlers(sshService)
  registerTranslateHandlers()
  registerSysmonHandlers()

  logger.info('app', 'App ready')

  typedHandle(CLIPBOARD_CHANNELS.READ_FILE_PATHS, () => {
    return platform.getClipboardFilePaths()
  })

  typedHandle(CLIPBOARD_CHANNELS.WRITE_FILE_PATHS, (_event, paths: string[]) => {
    platform.setClipboardFilePaths(paths)
  })

  typedHandle(CLIPBOARD_CHANNELS.SAVE_IMAGE, async (_event, destDir: string) => {
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

  typedHandle(SHELL_CHANNELS.OPEN_PATH, (_event, path: string) => shell.openPath(path))
  typedHandle(SHELL_CHANNELS.OPEN_WITH, (_event, command: string, filePath: string) => {
    spawn(command, [filePath], { detached: true, stdio: 'ignore' }).unref()
  })

  typedOn(WINDOW_CHANNELS.MINIMIZE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })
  typedOn(WINDOW_CHANNELS.MAXIMIZE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  typedOn(WINDOW_CHANNELS.CLOSE, (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
  typedOn(WINDOW_CHANNELS.FORCE_CLOSE, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      (win as BrowserWindow & { _forceClose?: boolean })._forceClose = true
      win.close()
    }
  })
  typedHandle(WINDOW_CHANNELS.IS_MAXIMIZED, (event) => {
    return BrowserWindow.fromWebContents(event.sender)?.isMaximized() ?? false
  })

  typedHandle(SELFMON_CHANNELS.METRICS, () => {
    const mem = process.memoryUsage()
    const now = Date.now()
    const elapsed = (now - lastCpuTime) / 1000
    const cpu = process.cpuUsage(lastCpuUsage)
    // user + system microseconds → percent of wall time
    const cpuPercent = elapsed > 0
      ? ((cpu.user + cpu.system) / 1_000_000) / elapsed * 100
      : 0
    lastCpuUsage = process.cpuUsage()
    lastCpuTime = now

    return {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      cpuPercent: Math.round(cpuPercent * 10) / 10,
      ptyCount: ptyManager.sessionCount,
      uptime: Math.floor(process.uptime())
    }
  })

  function setupWindowEvents(win: BrowserWindow): void {
    win.on('close', (e) => {
      if ((win as BrowserWindow & { _forceClose?: boolean })._forceClose) return
      e.preventDefault()
      if (!win.isDestroyed()) win.webContents.send(WINDOW_CHANNELS.CONFIRM_CLOSE)
    })
    win.on('maximize', () => {
      if (!win.isDestroyed()) win.webContents.send(WINDOW_CHANNELS.MAXIMIZED_CHANGE, true)
    })
    win.on('unmaximize', () => {
      if (!win.isDestroyed()) win.webContents.send(WINDOW_CHANNELS.MAXIMIZED_CHANGE, false)
    })
  }

  const mainWin = createWindow()
  setupWindowEvents(mainWin)
  logger.info('app', 'Window created')

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const win = createWindow()
      setupWindowEvents(win)
    }
  })
})

app.on('window-all-closed', () => {
  logger.info('app', 'All windows closed')
  ptyManager.destroyAll()
  fsWatcher.unwatchAll()
  sshService.disconnectAll()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  logger.info('app', 'Quitting')
  ptyManager.destroyAll()
  fsWatcher.unwatchAll()
  sshService.disconnectAll()
})
