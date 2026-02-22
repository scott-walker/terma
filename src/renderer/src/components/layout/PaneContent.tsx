import { memo, useMemo } from 'react'
import { Server, Loader2, AlertCircle, Bot } from 'lucide-react'
import type { PaneType } from '@/lib/layout-tree'
import { TerminalPane } from '../terminal/Terminal'
import { FileManagerPane } from '../file-manager/FileManagerPane'
import { MarkdownPane } from '../markdown/MarkdownPane'
import { ImagePane } from '../image/ImagePane'
import { SystemMonitorPane } from '../system-monitor/SystemMonitorPane'
import { ErrorBoundary } from './ErrorBoundary'
import { useSettingsStore } from '@/stores/settings-store'
import { useSshStore } from '@/stores/ssh-store'
import { useAgentStore } from '@/stores/agent-store'

interface PaneContentProps {
  paneType: PaneType
  tabId: string
  paneId: string
  isActive: boolean
  cwd?: string | null
}

function parseCommand(raw: string): { command: string; args: string[] } {
  const parts = raw.trim().split(/\s+/)
  return { command: parts[0] || 'claude', args: parts.slice(1) }
}

function SshPlaceholder({ state, error }: { state: string; error?: string }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        {state === 'connecting' ? (
          <>
            <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-fg-muted" />
            <span className="text-sm text-fg-muted">Connecting...</span>
          </>
        ) : state === 'error' ? (
          <>
            <AlertCircle size={28} strokeWidth={1.5} className="text-danger" />
            <span className="text-sm text-danger">Connection failed</span>
            {error && <span className="max-w-[300px] text-center text-xs text-fg-muted">{error}</span>}
          </>
        ) : (
          <>
            <Server size={28} strokeWidth={1.5} className="text-fg-muted/50" />
            <span className="text-sm text-fg-muted">Select a connection to start</span>
          </>
        )}
      </div>
    </div>
  )
}

function AgentPlaceholder(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Bot size={28} strokeWidth={1.5} className="text-fg-muted/50" />
        <span className="text-sm text-fg-muted">Select an agent to start</span>
      </div>
    </div>
  )
}

export const PaneContent = memo(function PaneContent({ paneType, tabId, paneId, isActive, cwd }: PaneContentProps): JSX.Element {
  const agentProfileId = useAgentStore((s) => s.panes[paneId])
  const agentProfile = useSettingsStore((s) => s.settings.agentProfiles?.find((p) => p.id === agentProfileId))
  const agentParsed = useMemo(() => agentProfile ? parseCommand(agentProfile.command) : null, [agentProfile])
  const sshState = useSshStore((s) => s.panes[paneId])

  // SSH mode active but not connected → show placeholder
  if (sshState && sshState.state !== 'connected') {
    return <SshPlaceholder state={sshState.state} error={sshState.error} />
  }

  let content: JSX.Element

  // SSH connected → use SSH-specific terminal key
  const isSshConnected = sshState?.state === 'connected'

  switch (paneType) {
    case 'file-manager':
      content = <FileManagerPane tabId={tabId} paneId={paneId} cwd={cwd} />
      break
    case 'agent':
      if (!agentParsed) {
        content = <AgentPlaceholder />
      } else {
        content = <TerminalPane tabId={tabId} paneId={paneId} terminalKey={paneId + ':agent'} active={isActive} cwd={cwd} command={agentParsed.command} args={agentParsed.args} />
      }
      break
    case 'markdown':
      content = <MarkdownPane tabId={tabId} paneId={paneId} filePath={cwd ?? ''} />
      break
    case 'image':
      content = <ImagePane tabId={tabId} paneId={paneId} filePath={cwd ?? ''} />
      break
    case 'system-monitor':
      content = <SystemMonitorPane paneId={paneId} />
      break
    case 'terminal':
    default:
      content = isSshConnected
        ? <TerminalPane tabId={tabId} paneId={paneId} terminalKey={paneId + ':ssh'} active={isActive} cwd={cwd} />
        : <TerminalPane tabId={tabId} paneId={paneId} active={isActive} cwd={cwd} />
      break
  }

  return <ErrorBoundary key={paneId + paneType + (isSshConnected ? ':ssh' : '')}>{content}</ErrorBoundary>
})
