import { useTabStore } from '@/stores/tab-store'
import { TabItem } from '@/components/ui/TabItem'

export function TabBar(): JSX.Element {
  const { tabOrder, tabs, activeTabId, createTab, closeTab, setActiveTab, setTitle } = useTabStore()

  return (
    <div className="no-drag-region flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border px-3">
      {tabOrder.map((id) => {
        const tab = tabs[id]
        if (!tab) return null
        return (
          <TabItem
            key={id}
            title={tab.title}
            isActive={id === activeTabId}
            canClose={tabOrder.length > 1}
            onClick={() => setActiveTab(id)}
            onClose={() => closeTab(id)}
            onRename={(newTitle) => setTitle(id, newTitle)}
          />
        )
      })}
      <button
        onClick={() => createTab()}
        className="ml-1.5 cursor-pointer rounded-sm border border-dashed border-border bg-transparent px-3.5 py-1.5 text-lg leading-none text-fg-muted hover:border-border-hover hover:text-fg-secondary"
      >
        +
      </button>
    </div>
  )
}
