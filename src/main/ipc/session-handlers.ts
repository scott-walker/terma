import { ipcMain } from 'electron'
import { SESSION_CHANNELS } from '../../shared/channels'
import type { SessionState } from '../../shared/types'
import { SessionService } from '../sessions/session-service'
import { typedHandle } from './handlers'

export function registerSessionHandlers(): void {
  typedHandle(SESSION_CHANNELS.SAVE, (_event, state: SessionState) => {
    SessionService.save(state)
  })

  // Synchronous save for beforeunload — blocks renderer until write completes
  ipcMain.on(SESSION_CHANNELS.SAVE_SYNC, (event, state: SessionState) => {
    try {
      SessionService.save(state)
    } catch {
      // Best-effort on close
    }
    event.returnValue = true
  })

  typedHandle(SESSION_CHANNELS.LOAD, () => {
    return SessionService.load()
  })
}
