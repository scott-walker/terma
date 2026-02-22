import { ipcMain } from 'electron'
import { SESSION_CHANNELS } from '../../shared/channels'
import type { SessionState } from '../../shared/types'
import { SessionService } from '../sessions/session-service'
import { wrapHandler } from './handlers'

export function registerSessionHandlers(): void {
  ipcMain.handle(SESSION_CHANNELS.SAVE, wrapHandler(SESSION_CHANNELS.SAVE, (_event, state: SessionState) => {
    SessionService.save(state)
  }))

  ipcMain.handle(SESSION_CHANNELS.LOAD, wrapHandler(SESSION_CHANNELS.LOAD, () => {
    return SessionService.load()
  }))
}
