import { SHARE_CHANNELS } from '../../shared/channels'
import { typedHandle } from './handlers'
import type { ShareService } from '../share/share-service'
import type { PtyManager } from '../pty/pty-manager'

export function registerShareHandlers(ptyManager: PtyManager, shareService: ShareService): void {
  typedHandle(SHARE_CHANNELS.START, (_event, ptyId: string) => {
    return shareService.start(ptyId, ptyManager)
  })

  typedHandle(SHARE_CHANNELS.STOP, (_event, sessionId: string) => {
    shareService.stop(sessionId)
  })

  typedHandle(SHARE_CHANNELS.STATUS, (_event, sessionId: string) => {
    return shareService.getStatus(sessionId)
  })
}
