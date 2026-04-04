import { useState, useEffect, useRef, useCallback } from 'react'
import { Loader2, Cpu, MemoryStick, HardDrive, Activity, MonitorCog, Network, Clock, Thermometer, ChevronRight, ArrowDown, ArrowUp } from 'lucide-react'
import type { SystemMetrics } from '@shared/types'

interface SystemMonitorPaneProps {
  paneId: string
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB`
  const gb = mb / 1024
  if (gb < 1024) return `${gb.toFixed(1)} GB`
  return `${(gb / 1024).toFixed(1)} TB`
}

function formatSpeed(bytesPerSec: number | null): string {
  if (bytesPerSec === null || bytesPerSec < 0) return '—'
  if (bytesPerSec < 1024) return `${bytesPerSec.toFixed(0)} B/s`
  const kb = bytesPerSec / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB/s`
  const mb = kb / 1024
  if (mb < 1024) return `${mb.toFixed(1)} MB/s`
  return `${(mb / 1024).toFixed(1)} GB/s`
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function loadColor(percent: number): string {
  if (percent >= 80) return 'bg-danger'
  if (percent >= 50) return 'bg-warning'
  return 'bg-accent'
}

function loadTextColor(percent: number): string {
  if (percent >= 80) return 'text-danger'
  if (percent >= 50) return 'text-warning'
  return 'text-accent'
}

function tempColor(temp: number): string {
  if (temp >= 85) return 'text-danger'
  if (temp >= 70) return 'text-warning'
  return 'text-fg-muted'
}

function LoadBar({ percent, label }: { percent: number; label?: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="w-10 shrink-0 text-right text-xs text-fg-muted">{label}</span>}
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full transition-all duration-500 ${loadColor(percent)}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className={`w-11 shrink-0 text-right text-xs font-medium ${loadTextColor(percent)}`}>
        {percent.toFixed(1)}%
      </span>
    </div>
  )
}

function CollapsibleSection({ icon: Icon, title, children, defaultOpen = true }: {
  icon: typeof Cpu
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)
  const toggle = useCallback(() => setOpen((v) => !v), [])

  return (
    <section className="flex flex-col gap-2">
      <button
        type="button"
        onClick={toggle}
        className="flex cursor-pointer items-center gap-2 border-b border-border pb-1.5 text-left"
      >
        <ChevronRight
          size={14}
          strokeWidth={2}
          className={`text-fg-muted transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
        />
        <Icon size={14} strokeWidth={1.8} className="text-info" />
        <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{title}</span>
      </button>
      {open && <div className="pl-5">{children}</div>}
    </section>
  )
}

export function SystemMonitorPane({ paneId }: SystemMonitorPaneProps): JSX.Element {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const fetchMetrics = async (): Promise<void> => {
      try {
        const data = await window.api.sysmon.getMetrics()
        if (mountedRef.current) {
          setMetrics(data)
          setError(null)
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
        }
      }
    }

    fetchMetrics()
    const interval = setInterval(fetchMetrics, 2500)

    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [paneId])

  if (error && !metrics) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-danger">
        {error}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} strokeWidth={1.5} className="animate-spin text-fg-muted" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto p-4">
      {/* Processes & Uptime */}
      <CollapsibleSection icon={Activity} title="Processes">
        <div className="flex items-baseline gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-fg">{metrics.processCount}</span>
            <span className="text-xs text-fg-muted">running</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-fg-muted">
            <Clock size={12} strokeWidth={1.8} />
            <span>Uptime: <span className="text-fg">{formatUptime(metrics.uptime)}</span></span>
          </div>
        </div>
      </CollapsibleSection>

      {/* Memory */}
      <CollapsibleSection icon={MemoryStick} title="Memory">
        <div className="flex flex-col gap-1.5">
          <LoadBar percent={metrics.ram.usedPercent} />
          <div className="flex gap-4 text-xs text-fg-muted">
            <span>Used: <span className="text-fg">{formatBytes(metrics.ram.used)}</span></span>
            <span>Free: <span className="text-fg">{formatBytes(metrics.ram.free)}</span></span>
            <span>Total: <span className="text-fg">{formatBytes(metrics.ram.total)}</span></span>
          </div>
          {metrics.swap.total > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              <span className="text-xs text-fg-muted">Swap</span>
              <LoadBar percent={metrics.swap.usedPercent} />
              <div className="flex gap-4 text-xs text-fg-muted">
                <span>Used: <span className="text-fg">{formatBytes(metrics.swap.used)}</span></span>
                <span>Total: <span className="text-fg">{formatBytes(metrics.swap.total)}</span></span>
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* CPU */}
      <CollapsibleSection icon={Cpu} title="CPU">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-fg-muted">{metrics.cpu.model}</span>
            <span className="text-xs text-fg-muted">({metrics.cpu.cores} cores)</span>
            {metrics.cpu.tempMain !== null && (
              <span className={`flex items-center gap-1 text-xs ${tempColor(metrics.cpu.tempMain)}`}>
                <Thermometer size={11} strokeWidth={1.8} />
                {metrics.cpu.tempMain.toFixed(0)}°C
              </span>
            )}
          </div>
          <LoadBar percent={metrics.cpu.avgLoad} label="Avg" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-4 gap-y-1">
            {metrics.cpu.coreLoads.map((core) => (
              <LoadBar key={core.core} percent={core.load} label={`#${core.core}`} />
            ))}
          </div>
        </div>
      </CollapsibleSection>

      {/* GPU */}
      {metrics.gpus.length > 0 && (
        <CollapsibleSection icon={MonitorCog} title="GPU">
          <div className="flex flex-col gap-4">
            {metrics.gpus.map((gpu, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-medium text-fg">{gpu.model}</span>
                  <span className="text-xs text-fg-muted">{gpu.bus === 'Onboard' ? 'iGPU' : gpu.bus}</span>
                  {gpu.temperatureGpu !== null && (
                    <span className={`flex items-center gap-1 text-xs ${tempColor(gpu.temperatureGpu)}`}>
                      <Thermometer size={11} strokeWidth={1.8} />
                      {gpu.temperatureGpu.toFixed(0)}°C
                    </span>
                  )}
                  {gpu.fanSpeed !== null && gpu.fanSpeed > 0 && (
                    <span className="text-xs text-fg-muted">Fan: {gpu.fanSpeed}%</span>
                  )}
                  {gpu.powerDraw !== null && gpu.powerDraw > 0 && (
                    <span className="text-xs text-fg-muted">{gpu.powerDraw.toFixed(0)}W</span>
                  )}
                </div>
                {gpu.utilizationGpu !== null && (
                  <LoadBar percent={gpu.utilizationGpu} label="Core" />
                )}
                {gpu.memoryTotal > 0 && (
                  <LoadBar
                    percent={(gpu.memoryUsed / gpu.memoryTotal) * 100}
                    label="VRAM"
                  />
                )}
                <div className="flex gap-4 text-xs text-fg-muted">
                  {gpu.memoryTotal > 0 && (
                    <>
                      <span>Used: <span className="text-fg">{formatBytes(gpu.memoryUsed)}</span></span>
                      <span>Free: <span className="text-fg">{formatBytes(gpu.memoryFree)}</span></span>
                      <span>Total: <span className="text-fg">{formatBytes(gpu.memoryTotal)}</span></span>
                    </>
                  )}
                  {gpu.clockCore !== null && (
                    <span>Core: <span className="text-fg">{gpu.clockCore} MHz</span></span>
                  )}
                  {gpu.clockMemory !== null && (
                    <span>Mem: <span className="text-fg">{gpu.clockMemory} MHz</span></span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Network */}
      {metrics.network.length > 0 && (
        <CollapsibleSection icon={Network} title="Network">
          <div className="flex flex-col gap-2">
            {metrics.network.map((net) => (
              <div key={net.iface} className="flex items-center gap-4 text-xs">
                <span className="shrink-0 font-medium text-fg">{net.iface}</span>
                <div className="flex flex-1 items-center justify-end gap-4 text-fg-muted">
                  <span className="inline-flex items-center gap-0.5"><ArrowDown size={11} strokeWidth={2} className="text-danger" /> <span className="text-fg">{formatSpeed(net.rxSec)}</span></span>
                  <span className="inline-flex items-center gap-0.5"><ArrowUp size={11} strokeWidth={2} className="text-accent" /> <span className="text-fg">{formatSpeed(net.txSec)}</span></span>
                  <span className="inline-flex items-center gap-0.5">Total <ArrowDown size={11} strokeWidth={2} className="text-danger" /> <span className="text-fg">{formatBytes(net.rxTotal)}</span></span>
                  <span className="inline-flex items-center gap-0.5">Total <ArrowUp size={11} strokeWidth={2} className="text-accent" /> <span className="text-fg">{formatBytes(net.txTotal)}</span></span>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Disk */}
      <CollapsibleSection icon={HardDrive} title="Disk">
        <div className="flex flex-col gap-3">
          {metrics.disks.map((disk) => (
            <div key={disk.mount} className="flex flex-col gap-1">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-fg">{disk.mount}</span>
                <span className="text-xs text-fg-muted">{disk.fs}</span>
              </div>
              <LoadBar percent={disk.usedPercent} />
              <div className="flex gap-4 text-xs text-fg-muted">
                <span>Used: <span className="text-fg">{formatBytes(disk.used)}</span></span>
                <span>Total: <span className="text-fg">{formatBytes(disk.size)}</span></span>
              </div>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </div>
  )
}
