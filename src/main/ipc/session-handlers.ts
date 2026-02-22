import { SESSION_CHANNELS } from '../../shared/channels'
import type { SessionState } from '../../shared/types'
import { SessionService } from '../sessions/session-service'
import { typedHandle } from './handlers'

export function registerSessionHandlers(): void {
  typedHandle(SESSION_CHANNELS.SAVE, (_event, state: SessionState) => {
    SessionService.save(state)
  })

  typedHandle(SESSION_CHANNELS.LOAD, () => {
    return SessionService.load()
  })
}
