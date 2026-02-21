import { useTabStore } from '@/stores/tab-store'
import { getAllPaneIds } from '@/lib/layout-tree'

export function StatusBar(): JSX.Element {
  const tabOrder = useTabStore((s) => s.tabOrder)
  const activeTab = useTabStore((s) => (s.activeTabId ? s.tabs[s.activeTabId] : null))

  const paneCount = activeTab ? getAllPaneIds(activeTab.layoutTree).length : 0

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-1.5 text-xs text-fg-muted">
      <div className="flex gap-5">
        <span>
          <span className="text-accent">●</span> SSH: connected
        </span>
        <span>zsh</span>
      </div>
      <div className="flex gap-5">
        <span>{paneCount} sessions</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}
