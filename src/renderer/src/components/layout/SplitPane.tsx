import { Group, Panel, Separator } from 'react-resizable-panels'
import { LayoutNode } from '@/lib/layout-tree'
import { PaneWrapper } from './PaneWrapper'
import { useTabStore } from '@/stores/tab-store'

interface SplitPaneProps {
  node: LayoutNode
  tabId: string
  isTabActive: boolean
}

export function SplitPane({ node, tabId, isTabActive }: SplitPaneProps): JSX.Element {
  const activePaneId = useTabStore((s) => s.tabs[tabId]?.activePaneId)
  const setActivePaneId = useTabStore((s) => s.setActivePaneId)
  const updateLayoutRatios = useTabStore((s) => s.updateLayoutRatios)

  if (node.type === 'pane') {
    return (
      <div
        className="h-full w-full"
        onMouseDown={() => setActivePaneId(tabId, node.id)}
      >
        <PaneWrapper
          node={node}
          tabId={tabId}
          isActive={isTabActive && node.id === activePaneId}
        />
      </div>
    )
  }

  // Layout tree 'vertical' = vertical divider = panels side by side → orientation 'horizontal'
  // Layout tree 'horizontal' = horizontal divider = panels stacked → orientation 'vertical'
  const orientation = node.direction === 'vertical' ? 'horizontal' : 'vertical'

  return (
    <Group
      orientation={orientation}
      onLayout={(sizes: number[]) => updateLayoutRatios(tabId, node.id, sizes)}
    >
      {node.children.map((child, i) => (
        <SplitPaneEntry key={child.id} index={i} total={node.children.length}>
          <SplitPane node={child} tabId={tabId} isTabActive={isTabActive} />
        </SplitPaneEntry>
      ))}
    </Group>
  )
}

function SplitPaneEntry({
  children,
  index,
  total
}: {
  children: React.ReactNode
  index: number
  total: number
}): JSX.Element {
  return (
    <>
      {index > 0 && (
        <Separator className="group relative flex items-center justify-center data-[state=drag]:bg-accent/30">
          <div className="h-full w-1 group-hover:bg-accent/30" />
        </Separator>
      )}
      <Panel min="10%" default={`${100 / total}%`}>
        {children}
      </Panel>
    </>
  )
}
