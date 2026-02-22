import { useState, useEffect, useRef } from 'react'
import { Loader2, Cpu, MemoryStick, HardDrive, Activity } from 'lucide-react'
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

function SectionHeader({ icon: Icon, title }: { icon: typeof Cpu; title: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-1.5">
      <Icon size={14} strokeWidth={1.8} className="text-info" />
      <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">{title}</span>
    </div>
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
      {/* Processes */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Activity} title="Processes" />
        <div className="flex items-baseline gap-2 pl-5">
          <span className="text-2xl font-semibold text-fg">{metrics.processCount}</span>
          <span className="text-xs text-fg-muted">running</span>
        </div>
      </section>

      {/* Memory */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={MemoryStick} title="Memory" />
        <div className="flex flex-col gap-1.5 pl-5">
          <LoadBar percent={metrics.ram.usedPercent} />
          <div className="flex gap-4 text-xs text-fg-muted">
            <span>Used: <span className="text-fg">{formatBytes(metrics.ram.used)}</span></span>
            <span>Free: <span className="text-fg">{formatBytes(metrics.ram.free)}</span></span>
            <span>Total: <span className="text-fg">{formatBytes(metrics.ram.total)}</span></span>
          </div>
        </div>
      </section>

      {/* CPU */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={Cpu} title="CPU" />
        <div className="flex flex-col gap-2 pl-5">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-fg-muted">{metrics.cpu.model}</span>
            <span className="text-xs text-fg-muted">({metrics.cpu.cores} cores)</span>
          </div>
          <LoadBar percent={metrics.cpu.avgLoad} label="Avg" />
          <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-4 gap-y-1">
            {metrics.cpu.coreLoads.map((core) => (
              <LoadBar key={core.core} percent={core.load} label={`#${core.core}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Disk */}
      <section className="flex flex-col gap-2">
        <SectionHeader icon={HardDrive} title="Disk" />
        <div className="flex flex-col gap-3 pl-5">
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
      </section>
    </div>
  )
}
