import si from 'systeminformation'
import { logger } from './logger-service'
import type { SystemMetrics } from '../../shared/types'

class SystemMonitorService {
  async getMetrics(): Promise<SystemMetrics> {
    try {
      const [load, mem, disks, procs, cpuInfo] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.processes(),
        si.cpu()
      ])

      return {
        processCount: procs.all,
        ram: {
          total: mem.total,
          used: mem.used,
          free: mem.free,
          usedPercent: (mem.used / mem.total) * 100
        },
        cpu: {
          cores: cpuInfo.cores,
          model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
          avgLoad: load.currentLoad,
          coreLoads: load.cpus.map((c, i) => ({ core: i, load: c.load }))
        },
        disks: disks
          .filter((d) => d.size > 0)
          .map((d) => ({
            fs: d.fs,
            size: d.size,
            used: d.used,
            usedPercent: d.use,
            mount: d.mount
          }))
      }
    } catch (err) {
      logger.error('sysmon', 'Failed to collect metrics', err instanceof Error ? err.message : err)
      throw err
    }
  }
}

export const systemMonitorService = new SystemMonitorService()
