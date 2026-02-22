import { ipcMain, BrowserWindow } from 'electron'
import { SETTINGS_CHANNELS } from '../../shared/channels'
import { SettingsService } from '../settings/settings-service'
import { logger } from '../services/logger-service'
import { wrapHandler } from './handlers'
import type { TerminalSettings } from '../../shared/settings'

function broadcastSettings(settings: TerminalSettings): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(SETTINGS_CHANNELS.CHANGED, settings)
    }
  }
}

export function registerSettingsHandlers(): void {
  ipcMain.handle(SETTINGS_CHANNELS.GET, wrapHandler(SETTINGS_CHANNELS.GET, () => {
    return SettingsService.getAll()
  }))

  ipcMain.handle(SETTINGS_CHANNELS.UPDATE, wrapHandler(SETTINGS_CHANNELS.UPDATE, (_event, partial: Partial<TerminalSettings>) => {
    logger.info('settings', 'Settings updated', Object.keys(partial))
    const settings = SettingsService.update(partial)
    broadcastSettings(settings)
    return settings
  }))

  ipcMain.handle(SETTINGS_CHANNELS.RESET, wrapHandler(SETTINGS_CHANNELS.RESET, () => {
    const settings = SettingsService.reset()
    broadcastSettings(settings)
    return settings
  }))
}
