import { LOG_CHANNELS } from '../../shared/channels'
import { logger } from '../services/logger-service'
import { typedHandle } from './handlers'

export function registerLogHandlers(): void {
  typedHandle(LOG_CHANNELS.GET_LOGS, () => {
    return logger.getEntries()
  })
}
