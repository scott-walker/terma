import { memo, useRef, useCallback } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import type { LayoutNode } from '@/lib/layout-tree'
import { PaneWrapper } from './PaneWrapper'
import { useTabStore } from '@/stores/tab-store'
import { setResizingPanes, clearResizingPanes } from '@/lib/terminal-manager'

function collectPaneIds(node: LayoutNode): string[] {
  if (node.type === 'pane') return [node.id]
  return node.children.flatMap(collectPaneIds)
}

interface SplitPaneProps {
  node: LayoutNode
  tabId: string
  isTabActive: boolean
}

export const SplitPane = memo(function SplitPane({ node, tabId, isTabActive }: SplitPaneProps): JSX.Element {
  const activePaneId = useTabStore((s) => s.tabs[tabId]?.activePaneId)
  const setActivePaneId = useTabStore((s) => s.setActivePaneId)
  const updateLayoutRatios = useTabStore((s) => s.updateLayoutRatios)
  const isResizingRef = useRef(false)

  // Fires on every frame during pointer-driven resize; once for programmatic changes
  const handleLayoutChange = useCallback(() => {
    if (!isResizingRef.current && node.type === 'branch') {
      isResizingRef.current = true
      const allPaneIds = node.children.flatMap(collectPaneIds)
      setResizingPanes(allPaneIds)
    }
  }, [node])

  // Fires after pointer release (for drag) or immediately (for programmatic changes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChanged = useCallback((layout: any) => {
    if (isResizingRef.current) {
      isResizingRef.current = false
      clearResizingPanes()
    }
    if (node.type === 'branch') {
      const sizes: number[] = Array.isArray(layout) ? layout : Object.values(layout)
      updateLayoutRatios(tabId, node.id, sizes)
    }
  }, [tabId, node, updateLayoutRatios])

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
  const handleClass = orientation === 'horizontal' ? 'h-full w-1.5' : 'w-full h-1.5'
  // Width minimum: header tabs (Terminal/Files/Agent) + action buttons + padding
  // Height minimum: header + enough content to be usable
  const minPanelSize = orientation === 'horizontal' ? '370px' : '120px'

  return (
    <div className="h-full w-full">
      <Group
        orientation={orientation}
        onLayoutChange={handleLayoutChange}
        onLayoutChanged={handleLayoutChanged}
        resizeTargetMinimumSize={{ fine: 0, coarse: 0 }}
      >
        {node.children.flatMap((child, i) => {
          const items: React.ReactNode[] = []
          if (i > 0) {
            items.push(
              <Separator key={`sep-${i}`} className="group relative flex items-center justify-center outline-none">
                <div className={`${handleClass} pointer-events-none group-hover:bg-pane-active/30`} />
              </Separator>
            )
          }
          items.push(
            <Panel key={child.id} minSize={minPanelSize} defaultSize={`${node.ratios[i]}%`}>
              <SplitPane node={child} tabId={tabId} isTabActive={isTabActive} />
            </Panel>
          )
          return items
        })}
      </Group>
    </div>
  )
})
