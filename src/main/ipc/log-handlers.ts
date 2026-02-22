import { ipcMain } from 'electron'
import { LOG_CHANNELS } from '../../shared/channels'
import { logger } from '../services/logger-service'

export function registerLogHandlers(): void {
  ipcMain.handle(LOG_CHANNELS.GET_LOGS, () => {
    return logger.getEntries()
  })
}
