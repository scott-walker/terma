import { memo, useMemo } from 'react'
import type { PaneType } from '@/lib/layout-tree'
import { TerminalPane } from '../terminal/Terminal'
import { FileManagerPane } from '../file-manager/FileManagerPane'
// import { EditorPane } from '../editor/EditorPane'
import { ErrorBoundary } from './ErrorBoundary'
import { useSettingsStore } from '@/stores/settings-store'

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

export const PaneContent = memo(function PaneContent({ paneType, tabId, paneId, isActive, cwd }: PaneContentProps): JSX.Element {
  const agentCommand = useSettingsStore((s) => s.settings.agentCommand)
  const parsed = useMemo(() => parseCommand(agentCommand), [agentCommand])

  let content: JSX.Element
  switch (paneType) {
    case 'file-manager':
      content = <FileManagerPane tabId={tabId} paneId={paneId} cwd={cwd} />
      break
    // case 'editor':
    //   content = <EditorPane tabId={tabId} paneId={paneId} active={isActive} cwd={cwd} />
    //   break
    case 'agent':
      content = <TerminalPane tabId={tabId} paneId={paneId} terminalKey={paneId + ':agent'} active={isActive} cwd={cwd} command={parsed.command} args={parsed.args} />
      break
    case 'terminal':
    default:
      content = <TerminalPane tabId={tabId} paneId={paneId} active={isActive} cwd={cwd} />
      break
  }

  return <ErrorBoundary key={paneId + paneType}>{content}</ErrorBoundary>
})
