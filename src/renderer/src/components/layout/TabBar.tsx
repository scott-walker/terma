import { useState, useCallback, useRef } from 'react'
import { useTabStore } from '@/stores/tab-store'
import { TabItem } from '@/components/ui/TabItem'
import { ContextMenu, type MenuEntry } from '@/components/ui/ContextMenu'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { getAllPaneIds } from '@/lib/layout-tree'

const DRAG_FORMAT = 'application/x-terma-tab'

const TAB_COLORS = [
  { id: 'red', label: 'Red' },
  { id: 'orange', label: 'Orange' },
  { id: 'yellow', label: 'Yellow' },
  { id: 'green', label: 'Green' },
  { id: 'blue', label: 'Blue' },
  { id: 'purple', label: 'Purple' }
]

export function TabBar(): JSX.Element {
  const { tabOrder, tabs, activeTabId, createTab, closeTab, setActiveTab, setTitle, setTabColor, reorderTabs } = useTabStore()
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropTarget, setDropTarget] = useState<{ index: number; side: 'left' | 'right' } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ position: { x: number; y: number }; tabId: string } | null>(null)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [confirmCloseTabId, setConfirmCloseTabId] = useState<string | null>(null)
  const dragCounters = useRef<Map<number, number>>(new Map())

  const handleCloseTab = useCallback((tabId: string) => {
    const tab = tabs[tabId]
    if (tab && getAllPaneIds(tab.layoutTree).length > 1) {
      setConfirmCloseTabId(tabId)
    } else {
      closeTab(tabId)
    }
  }, [tabs, closeTab])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDragIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData(DRAG_FORMAT, String(index))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    if (dragIndex === null || dragIndex === index) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    const mid = rect.left + rect.width / 2
    const side = e.clientX < mid ? 'left' : 'right'
    setDropTarget((prev) =>
      prev?.index === index && prev.side === side ? prev : { index, side }
    )
  }, [dragIndex])

  const handleDrop = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    const from = dragIndex
    if (from === null || from === index) return
    const rect = e.currentTarget.getBoundingClientRect()
    const mid = rect.left + rect.width / 2
    let to = e.clientX < mid ? index : index + 1
    if (from < to) to--
    if (from !== to) reorderTabs(from, to)
    setDragIndex(null)
    setDropTarget(null)
    dragCounters.current.clear()
  }, [dragIndex, reorderTabs])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
    setDropTarget(null)
    dragCounters.current.clear()
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    setContextMenu({ position: { x: e.clientX, y: e.clientY }, tabId })
  }, [])

  const contextMenuEntries: MenuEntry[] = contextMenu
    ? [
        {
          type: 'colors',
          colors: TAB_COLORS,
          activeColor: tabs[contextMenu.tabId]?.color ?? null,
          onSelect: (colorId) => setTabColor(contextMenu.tabId, colorId)
        },
        { type: 'separator' },
        {
          type: 'item',
          label: 'Rename',
          onAction: () => setEditingTabId(contextMenu.tabId)
        },
        {
          type: 'item',
          label: 'Close',
          disabled: tabOrder.length <= 1,
          onAction: () => handleCloseTab(contextMenu.tabId)
        }
      ]
    : []

  return (
    <div className="no-drag-region flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border px-3">
      {tabOrder.map((id, index) => {
        const tab = tabs[id]
        if (!tab) return null
        const isForceEditing = editingTabId === id
        return (
          <TabItem
            key={id}
            title={tab.title}
            isActive={id === activeTabId}
            canClose={tabOrder.length > 1}
            color={tab.color}
            forceEdit={isForceEditing}
            onClick={() => setActiveTab(id)}
            onClose={() => handleCloseTab(id)}
            onRename={(newTitle) => setTitle(id, newTitle)}
            onEditEnd={isForceEditing ? () => setEditingTabId(null) : undefined}
            onContextMenu={(e) => handleContextMenu(e, id)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            dropSide={dropTarget?.index === index ? dropTarget.side : null}
          />
        )
      })}
      <button
        onClick={() => createTab()}
        className="ml-1.5 cursor-pointer rounded-sm border border-dashed border-border bg-transparent px-3.5 py-1.5 text-lg leading-none text-fg-muted hover:border-border-hover hover:text-fg-secondary"
      >
        +
      </button>
      <ContextMenu
        position={contextMenu?.position ?? null}
        entries={contextMenuEntries}
        onClose={() => setContextMenu(null)}
      />
      {confirmCloseTabId && (
        <ConfirmDialog
          title="Close Tab"
          message="This tab has multiple panes. Close all of them?"
          confirmLabel="Close"
          onConfirm={() => {
            closeTab(confirmCloseTabId)
            setConfirmCloseTabId(null)
          }}
          onCancel={() => setConfirmCloseTabId(null)}
        />
      )}
    </div>
  )
}
