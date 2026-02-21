import { Group, Panel, Separator } from 'react-resizable-panels'
import { LayoutNode } from '@/lib/layout-tree'
import { TerminalPane } from '../terminal/Terminal'
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
        <TerminalPane
          tabId={tabId}
          paneId={node.id}
          active={isTabActive && node.id === activePaneId}
        />
      </div>
    )
  }

  const direction = node.direction === 'horizontal' ? 'horizontal' : 'vertical'

  return (
    <Group
      direction={direction}
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
        <Separator className="group relative flex items-center justify-center data-[state=drag]:bg-[#7aa2f7]/30">
          <div className="h-full w-1 group-hover:bg-[#7aa2f7]/30" />
        </Separator>
      )}
      <Panel min="10%" default={`${100 / total}%`}>
        {children}
      </Panel>
    </>
  )
}
