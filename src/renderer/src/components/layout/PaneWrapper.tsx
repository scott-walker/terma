import { memo, useState, useCallback, useEffect, useSyncExternalStore } from 'react'
import type { PaneNode } from '@/lib/layout-tree'
import { PANE_TYPE_CONFIGS, PANE_ACTIVE_CLASSES } from '@/lib/pane-types'
import { useTabStore } from '@/stores/tab-store'
import { isPaneResizing, subscribeResizing } from '@/lib/terminal-manager'
import { PaneHeader } from './PaneHeader'
import { PaneContent } from './PaneContent'

const MIME_TYPE = 'application/x-terma-pane'

interface PaneWrapperProps {
  node: PaneNode
  tabId: string
  isActive: boolean
}

export const PaneWrapper = memo(function PaneWrapper({ node, tabId, isActive }: PaneWrapperProps): JSX.Element {
  const paneType = node.paneType ?? 'terminal'
  const paneResizing = useSyncExternalStore(
    subscribeResizing,
    useCallback(() => isPaneResizing(node.id), [node.id])
  )
  const [overlayState, setOverlayState] = useState<'hidden' | 'active' | 'fading'>('hidden')
  const [isDragOver, setIsDragOver] = useState(false)

  useEffect(() => {
    if (paneResizing) {
      setOverlayState('active')
    } else {
      setOverlayState((prev) => (prev === 'active' ? 'fading' : prev))
    }
  }, [paneResizing])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(MIME_TYPE)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const raw = e.dataTransfer.getData(MIME_TYPE)
      if (!raw) return
      try {
        const { paneId: srcPaneId, tabId: srcTabId } = JSON.parse(raw)
        if (srcTabId === tabId && srcPaneId !== node.id) {
          useTabStore.getState().swapPanes(tabId, srcPaneId, node.id)
        }
      } catch {
        // ignore malformed data
      }
    },
    [tabId, node.id]
  )

  return (
    <div
      className={`relative flex h-full w-full flex-col overflow-hidden rounded-lg border-2 bg-base transition-[border-color] duration-200 ${
        isActive ? PANE_ACTIVE_CLASSES.paneBorderClass : 'border-border'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <PaneHeader tabId={tabId} paneId={node.id} paneType={paneType} />
      <div className="relative flex-1">
        <div className="absolute inset-0 overflow-hidden">
          <PaneContent paneType={paneType} tabId={tabId} paneId={node.id} isActive={isActive} cwd={node.cwd} />
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/5 to-transparent" />
        {overlayState !== 'hidden' && (
          <div
            className={`absolute inset-0 z-10 bg-base ${
              overlayState === 'fading'
                ? 'opacity-0 transition-opacity duration-1000'
                : 'opacity-80'
            }`}
            onTransitionEnd={() => setOverlayState('hidden')}
          />
        )}
      </div>
      {isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 rounded-lg border-2 border-accent bg-accent/10" />
      )}
    </div>
  )
})
