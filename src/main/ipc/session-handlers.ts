import { ipcMain } from 'electron'
import { SESSION_CHANNELS } from '../../shared/channels'
import { SessionService, type SessionState } from '../sessions/session-service'

export function registerSessionHandlers(): void {
  ipcMain.handle(SESSION_CHANNELS.SAVE, (_event, state: SessionState) => {
    SessionService.save(state)
  })

  ipcMain.handle(SESSION_CHANNELS.LOAD, () => {
    return SessionService.load()
  })
}
