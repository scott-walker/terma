import { memo } from 'react'
import type { PaneType } from '@/lib/layout-tree'
import { TerminalPane } from '../terminal/Terminal'
import { FileManagerPane } from '../file-manager/FileManagerPane'
import { EditorPane } from '../editor/EditorPane'
import { ErrorBoundary } from './ErrorBoundary'

interface PaneContentProps {
  paneType: PaneType
  tabId: string
  paneId: string
  isActive: boolean
  cwd?: string | null
}

export const PaneContent = memo(function PaneContent({ paneType, tabId, paneId, isActive, cwd }: PaneContentProps): JSX.Element {
  let content: JSX.Element
  switch (paneType) {
    case 'file-manager':
      content = <FileManagerPane tabId={tabId} paneId={paneId} cwd={cwd} />
      break
    case 'editor':
      content = <EditorPane tabId={tabId} paneId={paneId} active={isActive} cwd={cwd} />
      break
    case 'terminal':
    default:
      content = <TerminalPane tabId={tabId} paneId={paneId} active={isActive} cwd={cwd} />
      break
  }

  return <ErrorBoundary key={paneId + paneType}>{content}</ErrorBoundary>
})
