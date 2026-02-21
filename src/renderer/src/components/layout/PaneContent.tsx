import type { PaneType } from '@/lib/layout-tree'
import { TerminalPane } from '../terminal/Terminal'
import { FileManagerPane } from '../file-manager/FileManagerPane'
import { ErrorBoundary } from './ErrorBoundary'

interface PaneContentProps {
  paneType: PaneType
  tabId: string
  paneId: string
  isActive: boolean
}

export function PaneContent({ paneType, tabId, paneId, isActive }: PaneContentProps): JSX.Element {
  let content: JSX.Element
  switch (paneType) {
    case 'file-manager':
      content = <FileManagerPane paneId={paneId} />
      break
    case 'terminal':
    default:
      content = <TerminalPane tabId={tabId} paneId={paneId} active={isActive} />
      break
  }

  return <ErrorBoundary key={paneId + paneType}>{content}</ErrorBoundary>
}
