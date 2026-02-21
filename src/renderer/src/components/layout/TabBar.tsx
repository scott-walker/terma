import { Plus } from 'lucide-react'
import { useTabStore } from '@/stores/tab-store'
import { TabItem } from './Tab'

export function TabBar(): JSX.Element {
  const { tabOrder, tabs, activeTabId, createTab, closeTab, setActiveTab } = useTabStore()

  return (
    <div
      className="flex h-9 items-center gap-1 bg-[#0f0f17] px-2"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-1 overflow-x-auto">
        {tabOrder.map((id) => {
          const tab = tabs[id]
          if (!tab) return null
          return (
            <TabItem
              key={id}
              title={tab.title}
              active={id === activeTabId}
              onClick={() => setActiveTab(id)}
              onClose={() => closeTab(id)}
            />
          )
        })}
      </div>
      <button
        className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#565f89] transition-all duration-150 hover:bg-white/[0.06] hover:text-[#c0caf5]"
        onClick={() => createTab()}
        title="New tab (Ctrl+Shift+T)"
      >
        <Plus size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}
