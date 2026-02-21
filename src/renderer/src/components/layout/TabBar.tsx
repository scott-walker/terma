import { Plus } from 'lucide-react'
import { useTabStore } from '@/stores/tab-store'
import { TabItem } from './Tab'

export function TabBar(): JSX.Element {
  const { tabOrder, tabs, activeTabId, createTab, closeTab, setActiveTab } = useTabStore()

  return (
    <div
      className="flex h-11 items-center gap-1.5 border-b border-white/[0.04] bg-[#0f0f17] px-3"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-1.5 overflow-x-auto py-1">
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
        className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#565f89] transition-all duration-150 hover:bg-white/[0.06] hover:text-[#c0caf5]"
        onClick={() => createTab()}
        title="New tab (Ctrl+Shift+T)"
      >
        <Plus size={14} strokeWidth={1.8} />
      </button>
    </div>
  )
}
