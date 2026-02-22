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
  const pendingSizes = useRef<number[] | null>(null)

  const handleLayoutChanged = useCallback((sizes: number[]) => {
    pendingSizes.current = sizes
  }, [])

  const handlePointerDownCapture = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement
    const separator = target.closest('[data-separator]') as HTMLElement
    if (!separator) return

    // Only handle separators that are direct children of this Group
    const groupEl = (e.currentTarget as HTMLElement).firstElementChild
    if (!groupEl || separator.parentElement !== groupEl) return

    // Find separator index among sibling separators
    const separators = groupEl.querySelectorAll(':scope > [data-separator]')
    let sepIndex = -1
    separators.forEach((el, i) => {
      if (el === separator) sepIndex = i
    })
    if (sepIndex < 0 || node.type === 'pane') return

    const leftChild = node.children[sepIndex]
    const rightChild = node.children[sepIndex + 1]
    if (!leftChild || !rightChild) return

    const paneIds = [...collectPaneIds(leftChild), ...collectPaneIds(rightChild)]
    setResizingPanes(paneIds)
    pendingSizes.current = null

    const handleUp = (): void => {
      window.removeEventListener('pointerup', handleUp)
      clearResizingPanes()
      if (pendingSizes.current) {
        updateLayoutRatios(tabId, node.id, pendingSizes.current)
        pendingSizes.current = null
      }
    }
    window.addEventListener('pointerup', handleUp)
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

  return (
    <div className="h-full w-full" onPointerDownCapture={handlePointerDownCapture}>
      <Group
        orientation={orientation}
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
            <Panel key={child.id} order={i} min="10%" default={`${100 / node.children.length}%`}>
              <SplitPane node={child} tabId={tabId} isTabActive={isTabActive} />
            </Panel>
          )
          return items
        })}
      </Group>
    </div>
  )
})
