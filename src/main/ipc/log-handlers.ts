import { LOG_CHANNELS } from '../../shared/channels'
import { logger } from '../services/logger-service'
import { typedHandle } from './handlers'

export function registerLogHandlers(): void {
  typedHandle(LOG_CHANNELS.GET_LOGS, () => {
    return logger.getEntries()
  })

  typedHandle(LOG_CHANNELS.RENDERER_LOG, (_e, level: string, source: string, message: string) => {
    const fn = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info'
    logger[fn](source, message)
  })
}
