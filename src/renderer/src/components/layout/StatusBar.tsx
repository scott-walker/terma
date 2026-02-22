import { useCallback, useState, useEffect } from 'react'
import { ClipboardCopy, Wifi, Cpu, MemoryStick, Bot } from 'lucide-react'
import { useTabStore } from '@/stores/tab-store'
import { useSshStore } from '@/stores/ssh-store'
import { useAgentStore } from '@/stores/agent-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useToastStore } from '@/stores/toast-store'
import { getAllPaneIds, findNode } from '@/lib/layout-tree'
import type { SelfMetrics } from '@shared/types'

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

// Thresholds for an Electron terminal app
const MEM_NORMAL = 200 * 1024 * 1024  // 200 MB
const MEM_WARN = 400 * 1024 * 1024    // 400 MB
const MEM_MAX = 600 * 1024 * 1024     // 600 MB (scale cap)
const CPU_NORMAL = 5                    // 5%
const CPU_WARN = 15                     // 15%
const CPU_MAX = 30                      // 30% (scale cap)

function gaugeColor(value: number, normal: number, warn: number): string {
  if (value <= normal) return 'bg-accent'
  if (value <= warn) return 'bg-warning'
  return 'bg-danger'
}

function gaugePercent(value: number, max: number): number {
  return Math.min(100, Math.max(0, (value / max) * 100))
}

function Gauge({ value, max, normal, warn, label, tooltip }: {
  value: number
  max: number
  normal: number
  warn: number
  label: string
  tooltip: string
}): JSX.Element {
  const pct = gaugePercent(value, max)
  const color = gaugeColor(value, normal, warn)
  return (
    <span className="flex items-center gap-2" title={tooltip}>
      <span className="text-fg">{label}</span>
      <span className="relative h-2 w-20 overflow-hidden rounded-full bg-surface">
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </span>
    </span>
  )
}

export function StatusBar(): JSX.Element {
  const activeTab = useTabStore((s) => (s.activeTabId ? s.tabs[s.activeTabId] : null))
  const addToast = useToastStore((s) => s.addToast)
  const sshPanes = useSshStore((s) => s.panes)
  const sshProfiles = useSettingsStore((s) => s.settings.sshProfiles)

  const paneCount = activeTab ? getAllPaneIds(activeTab.layoutTree).length : 0

  const agentPanes = useAgentStore((s) => s.panes)
  const agentProfiles = useSettingsStore((s) => s.settings.agentProfiles)

  let activeCwd: string | null = null
  let activePaneId: string | null = null
  let activePaneType: string | null = null
  if (activeTab) {
    activePaneId = activeTab.activePaneId
    const node = findNode(activeTab.layoutTree, activeTab.activePaneId)
    if (node && node.type === 'pane') {
      activeCwd = node.cwd
      activePaneType = node.paneType
    }
  }

  const sshState = activePaneId ? sshPanes[activePaneId] : undefined
  const sshProfile = sshState
    ? sshProfiles.find((p) => p.id === sshState.profileId)
    : undefined

  const agentProfileId = activePaneId && activePaneType === 'agent'
    ? agentPanes[activePaneId]
    : undefined
  const agentProfile = agentProfileId
    ? agentProfiles?.find((p) => p.id === agentProfileId)
    : undefined

  // Self-monitoring metrics (poll every 3s)
  const [metrics, setMetrics] = useState<SelfMetrics | null>(null)

  useEffect(() => {
    let active = true
    const poll = (): void => {
      window.api.selfmon.getMetrics().then((m) => {
        if (active) setMetrics(m)
      }).catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 3000)
    return () => { active = false; clearInterval(interval) }
  }, [])

  const handleCopyLogs = useCallback(async () => {
    try {
      const entries = await window.api.log.getLogs()
      const text = entries
        .map((e) => {
          const ts = new Date(e.timestamp).toISOString()
          const data = e.data !== undefined ? ' ' + JSON.stringify(e.data) : ''
          return `[${ts}] [${e.level.toUpperCase()}] [${e.source}] ${e.message}${data}`
        })
        .join('\n')
      await navigator.clipboard.writeText(text)
      addToast('success', 'Logs copied')
    } catch {
      addToast('error', 'Failed to copy logs')
    }
  }, [addToast])

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3 text-lg text-fg">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {activeCwd && <span className="truncate">{activeCwd}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-5">
        {agentProfile && (
          <span className="flex items-center gap-1.5">
            <Bot size={17} className="text-info" />
            <span className="text-fg">{agentProfile.name}</span>
          </span>
        )}
        {sshState && (
          <span className="flex items-center gap-1.5">
            <Wifi
              size={17}
              className={
                sshState.state === 'connected'
                  ? 'text-accent'
                  : sshState.state === 'connecting'
                    ? 'text-warning animate-pulse'
                    : 'text-danger'
              }
            />
            <span className="text-fg">
              {sshProfile?.name ?? sshState.profileId}
              {sshState.state === 'connecting' && ' ...'}
            </span>
          </span>
        )}
        {metrics && (
          <>
            <Gauge
              value={metrics.rss}
              max={MEM_MAX}
              normal={MEM_NORMAL}
              warn={MEM_WARN}
              label={formatBytes(metrics.rss)}
              tooltip={`RAM (RSS): ${formatBytes(metrics.rss)}\nHeap: ${formatBytes(metrics.heapUsed)} / ${formatBytes(metrics.heapTotal)}\nNorm < 200 MB | Warn < 400 MB | Crit 400 MB+\nPTY: ${metrics.ptyCount} | Uptime: ${formatUptime(metrics.uptime)}`}
            />
            <Gauge
              value={metrics.cpuPercent}
              max={CPU_MAX}
              normal={CPU_NORMAL}
              warn={CPU_WARN}
              label={`${metrics.cpuPercent}%`}
              tooltip={`CPU (main process): ${metrics.cpuPercent}%\nNorm < 5% | Warn < 15% | Crit 15%+`}
            />
          </>
        )}
        <span>{paneCount} panes</span>
        <button
          onClick={handleCopyLogs}
          title="Copy logs to clipboard"
          className="cursor-pointer text-fg transition-colors hover:text-accent"
        >
          <ClipboardCopy size={17} />
        </button>
      </div>
    </div>
  )
}
