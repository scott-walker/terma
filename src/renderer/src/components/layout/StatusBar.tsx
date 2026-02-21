import { useTabStore } from '@/stores/tab-store'
import { getAllPaneIds } from '@/lib/layout-tree'

export function StatusBar(): JSX.Element {
  const tabOrder = useTabStore((s) => s.tabOrder)
  const activeTab = useTabStore((s) => (s.activeTabId ? s.tabs[s.activeTabId] : null))

  const paneCount = activeTab ? getAllPaneIds(activeTab.layoutTree).length : 0

  return (
    <div
      className="flex shrink-0 items-center justify-between text-fg-muted"
      style={{
        padding: '6px 16px',
        borderTop: '1px solid var(--color-border)',
        fontSize: 12
      }}
    >
      <div className="flex" style={{ gap: 20 }}>
        <span>
          <span className="text-accent">●</span> SSH: connected
        </span>
        <span>zsh</span>
      </div>
      <div className="flex" style={{ gap: 20 }}>
        <span>{paneCount} sessions</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}
