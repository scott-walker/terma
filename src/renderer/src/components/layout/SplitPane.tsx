import { memo, useRef, useCallback } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { LayoutNode } from '@/lib/layout-tree'
import { PaneWrapper } from './PaneWrapper'
import { useTabStore } from '@/stores/tab-store'
import { setResizing } from '@/lib/terminal-manager'

interface SplitPaneProps {
  node: LayoutNode
  tabId: string
  isTabActive: boolean
}

export const SplitPane = memo(function SplitPane({ node, tabId, isTabActive }: SplitPaneProps): JSX.Element {
  const activePaneId = useTabStore((s) => s.tabs[tabId]?.activePaneId)
  const setActivePaneId = useTabStore((s) => s.setActivePaneId)
  const updateLayoutRatios = useTabStore((s) => s.updateLayoutRatios)
  const pendingSizes = useRef<number[] | null>(null)

  const handleLayoutChanged = useCallback((sizes: number[]) => {
    pendingSizes.current = sizes
  }, [])

  const handlePointerDownCapture = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('[data-separator]')) return

    setResizing(true)
    pendingSizes.current = null
    const handleUp = (): void => {
      window.removeEventListener('pointerup', handleUp)
      setResizing(false)
      if (pendingSizes.current) {
        updateLayoutRatios(tabId, node.id, pendingSizes.current)
        pendingSizes.current = null
      }
    }
    window.addEventListener('pointerup', handleUp)
  }, [tabId, node.id, updateLayoutRatios])

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
    <div className="h-full w-full" onPointerDownCapture={handlePointerDownCapture}>
      <Group
        orientation={orientation}
        onLayoutChanged={handleLayoutChanged}
        resizeTargetMinimumSize={{ fine: 0, coarse: 0 }}
      >
        {node.children.map((child, i) => (
          <SplitPaneEntry key={child.id} index={i} total={node.children.length} orientation={orientation}>
            <SplitPane node={child} tabId={tabId} isTabActive={isTabActive} />
          </SplitPaneEntry>
        ))}
      </Group>
    </div>
  )
})

function SplitPaneEntry({
  children,
  index,
  total,
  orientation
}: {
  children: React.ReactNode
  index: number
  total: number
  orientation: 'horizontal' | 'vertical'
}): JSX.Element {
  const handleClass = orientation === 'horizontal'
    ? 'h-full w-1.5'
    : 'w-full h-1.5'

  return (
    <>
      {index > 0 && (
        <Separator className="group relative flex items-center justify-center">
          <div className={`${handleClass} pointer-events-none group-hover:bg-split-handle/30`} />
        </Separator>
      )}
      <Panel min="10%" default={`${100 / total}%`}>
        {children}
      </Panel>
    </>
  )
}
