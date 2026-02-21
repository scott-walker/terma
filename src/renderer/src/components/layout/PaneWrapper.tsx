import type { PaneNode } from '@/lib/layout-tree'
import { PANE_TYPE_CONFIGS } from '@/lib/pane-types'
import { PaneHeader } from './PaneHeader'
import { PaneContent } from './PaneContent'

interface PaneWrapperProps {
  node: PaneNode
  tabId: string
  isActive: boolean
}

export function PaneWrapper({ node, tabId, isActive }: PaneWrapperProps): JSX.Element {
  const paneType = node.paneType ?? 'terminal'
  const config = PANE_TYPE_CONFIGS[paneType] ?? PANE_TYPE_CONFIGS.terminal

  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-base"
      style={{
        borderRadius: 8,
        border: `1.5px solid ${isActive ? config.color + '88' : 'var(--color-border)'}`,
        transition: 'border-color 0.2s'
      }}
    >
      <PaneHeader tabId={tabId} paneId={node.id} paneType={paneType} />
      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-hidden">
          <PaneContent paneType={paneType} tabId={tabId} paneId={node.id} isActive={isActive} />
        </div>
      </div>
    </div>
  )
}
