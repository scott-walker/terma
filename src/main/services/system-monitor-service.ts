import si from 'systeminformation'
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { logger } from './logger-service'
import type { SystemMetrics, GpuInfo } from '../../shared/types'

async function readSysfs(path: string): Promise<string | null> {
  try {
    return (await readFile(path, 'utf-8')).trim()
  } catch {
    return null
  }
}

async function readSysfsNumber(path: string): Promise<number | null> {
  const val = await readSysfs(path)
  if (val === null) return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

/** Parse active clock from pp_dpm_sclk / pp_dpm_mclk (line ending with ' *') */
function parseActiveClock(content: string | null): number | null {
  if (!content) return null
  const match = content.match(/(\d+)Mhz\s+\*/)
  return match ? Number(match[1]) : null
}

/** Read AMD GPU metrics directly from sysfs (works for both iGPU and dGPU) */
async function readAmdGpuSysfs(busAddress: string): Promise<Partial<GpuInfo>> {
  // Find the right card by bus address
  const drmBase = '/sys/class/drm'
  let devicePath: string | null = null

  try {
    const cards = await readdir(drmBase)
    for (const card of cards) {
      if (!card.match(/^card\d+$/)) continue
      const busAddr = await readSysfs(join(drmBase, card, 'device/uevent'))
      if (busAddr && busAddr.includes(busAddress.replace(/^0000:/, ''))) {
        devicePath = join(drmBase, card, 'device')
        break
      }
    }
  } catch { /* ignore */ }

  // Fallback: try card0, card1
  if (!devicePath) {
    for (const card of ['card0', 'card1']) {
      const path = join(drmBase, card, 'device/gpu_busy_percent')
      if (await readSysfs(path) !== null) {
        devicePath = join(drmBase, card, 'device')
        break
      }
    }
  }

  if (!devicePath) return {}

  const [busyPercent, vramUsed, vramTotal, sclk, mclk] = await Promise.all([
    readSysfsNumber(join(devicePath, 'gpu_busy_percent')),
    readSysfsNumber(join(devicePath, 'mem_info_vram_used')),
    readSysfsNumber(join(devicePath, 'mem_info_vram_total')),
    readSysfs(join(devicePath, 'pp_dpm_sclk')),
    readSysfs(join(devicePath, 'pp_dpm_mclk'))
  ])

  // Temperature from hwmon
  let temp: number | null = null
  try {
    const hwmonDir = join(devicePath, 'hwmon')
    const hwmons = await readdir(hwmonDir)
    for (const h of hwmons) {
      const t = await readSysfsNumber(join(hwmonDir, h, 'temp1_input'))
      if (t !== null) {
        temp = t / 1000
        break
      }
    }
  } catch { /* ignore */ }

  const result: Partial<GpuInfo> = {}
  if (busyPercent !== null) result.utilizationGpu = busyPercent
  if (vramUsed !== null) result.memoryUsed = vramUsed
  if (vramTotal !== null) result.memoryTotal = vramTotal
  if (vramTotal !== null && vramUsed !== null) result.memoryFree = vramTotal - vramUsed
  if (temp !== null) result.temperatureGpu = temp
  result.clockCore = parseActiveClock(sclk)
  result.clockMemory = parseActiveClock(mclk)

  return result
}

class SystemMonitorService {
  async getMetrics(): Promise<SystemMetrics> {
    try {
      const [load, mem, disks, procs, cpuInfo, cpuTemp, graphics, netStats, time] =
        await Promise.all([
          si.currentLoad(),
          si.mem(),
          si.fsSize(),
          si.processes(),
          si.cpu(),
          si.cpuTemperature(),
          si.graphics(),
          si.networkStats(),
          si.time()
        ])

      const swapTotal = mem.swaptotal || 0

      // Enrich GPU data with sysfs metrics where systeminformation falls short
      const gpus: GpuInfo[] = await Promise.all(
        graphics.controllers.map(async (g) => {
          const base: GpuInfo = {
            model: g.name || g.model,
            bus: g.bus || 'Unknown',
            memoryTotal: (g.memoryTotal ?? 0) * 1024 * 1024,
            memoryUsed: (g.memoryUsed ?? 0) * 1024 * 1024,
            memoryFree: (g.memoryFree ?? 0) * 1024 * 1024,
            utilizationGpu: g.utilizationGpu ?? null,
            utilizationMemory: g.utilizationMemory ?? null,
            temperatureGpu: g.temperatureGpu ?? null,
            fanSpeed: g.fanSpeed !== -1 ? g.fanSpeed : null,
            clockCore: g.clockCore ?? null,
            clockMemory: g.clockMemory ?? null,
            powerDraw: g.powerDraw ?? null
          }

          // Try sysfs for AMD GPUs when systeminformation data is missing
          if (g.vendor?.toLowerCase().includes('amd') || g.model?.toLowerCase().includes('raphael') || g.model?.toLowerCase().includes('radeon')) {
            const sysfs = await readAmdGpuSysfs(g.busAddress ?? '')
            if (sysfs.utilizationGpu !== undefined && base.utilizationGpu === null) base.utilizationGpu = sysfs.utilizationGpu
            if (sysfs.memoryTotal && base.memoryTotal === 0) base.memoryTotal = sysfs.memoryTotal
            if (sysfs.memoryUsed && base.memoryUsed === 0) base.memoryUsed = sysfs.memoryUsed
            if (sysfs.memoryFree !== undefined && base.memoryFree === 0) base.memoryFree = sysfs.memoryFree
            if (sysfs.temperatureGpu !== undefined && base.temperatureGpu === null) base.temperatureGpu = sysfs.temperatureGpu
            if (sysfs.clockCore !== undefined && base.clockCore === null) base.clockCore = sysfs.clockCore
            if (sysfs.clockMemory !== undefined && base.clockMemory === null) base.clockMemory = sysfs.clockMemory
          }

          return base
        })
      )

      return {
        processCount: procs.all,
        uptime: time.uptime,
        ram: {
          total: mem.total,
          used: mem.active,
          free: mem.available,
          available: mem.available,
          usedPercent: (mem.active / mem.total) * 100
        },
        swap: {
          total: swapTotal,
          used: mem.swapused,
          free: mem.swapfree,
          usedPercent: swapTotal > 0 ? (mem.swapused / swapTotal) * 100 : 0
        },
        cpu: {
          cores: cpuInfo.cores,
          model: `${cpuInfo.manufacturer} ${cpuInfo.brand}`,
          avgLoad: load.currentLoad,
          coreLoads: load.cpus.map((c, i) => ({ core: i, load: c.load })),
          tempMain: cpuTemp.main !== -1 ? cpuTemp.main : null,
          tempCores: cpuTemp.cores.filter((t) => t !== -1)
        },
        gpus,
        network: netStats
          .filter((n) => n.operstate === 'up' && (n.rx_bytes > 0 || n.tx_bytes > 0))
          .map((n) => ({
            iface: n.iface,
            rxSec: n.rx_sec !== -1 ? n.rx_sec : null,
            txSec: n.tx_sec !== -1 ? n.tx_sec : null,
            rxTotal: n.rx_bytes,
            txTotal: n.tx_bytes
          })),
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
