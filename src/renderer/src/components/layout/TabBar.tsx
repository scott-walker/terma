import { useTabStore } from '@/stores/tab-store'
import { TabItem } from './Tab'

export function TabBar(): JSX.Element {
  const { tabOrder, tabs, activeTabId, createTab, closeTab, setActiveTab } = useTabStore()

  return (
    <div className="flex h-9 items-center gap-0.5 bg-[#16161e] px-2"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-0.5 overflow-x-auto">
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
        className="ml-1 flex h-6 w-6 shrink-0 items-center justify-center rounded text-[#565f89] hover:bg-[#1a1b26] hover:text-[#c0caf5]"
        onClick={() => createTab()}
        title="New tab"
      >
        <svg width="14" height="14" viewBox="0 0 14 14">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
