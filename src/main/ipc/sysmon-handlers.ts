import { SYSMON_CHANNELS } from '../../shared/channels'
import { typedHandle } from './handlers'
import { systemMonitorService } from '../services/system-monitor-service'

export function registerSysmonHandlers(): void {
  typedHandle(SYSMON_CHANNELS.METRICS, async () => {
    return systemMonitorService.getMetrics()
  })
}
