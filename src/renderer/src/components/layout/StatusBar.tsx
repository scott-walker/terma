import { useTabStore } from '@/stores/tab-store'
import { getAllPaneIds, findNode } from '@/lib/layout-tree'

export function StatusBar(): JSX.Element {
  const activeTab = useTabStore((s) => (s.activeTabId ? s.tabs[s.activeTabId] : null))

  const paneCount = activeTab ? getAllPaneIds(activeTab.layoutTree).length : 0

  let activeCwd: string | null = null
  if (activeTab) {
    const node = findNode(activeTab.layoutTree, activeTab.activePaneId)
    if (node && node.type === 'pane') {
      activeCwd = node.cwd
    }
  }

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2 text-sm text-fg-muted">
      <div className="min-w-0 flex-1">
        {activeCwd && <span className="truncate">{activeCwd}</span>}
      </div>
      <div className="shrink-0">
        <span>{paneCount} panes</span>
      </div>
    </div>
  )
}
