import { useTabStore } from '@/stores/tab-store'

export function TabBar(): JSX.Element {
  const { tabOrder, tabs, activeTabId, createTab, closeTab, setActiveTab } = useTabStore()

  return (
    <div
      className="flex shrink-0 items-center border-b border-border"
      style={{
        padding: '0 12px',
        gap: 2,
        overflowX: 'auto',
        WebkitAppRegion: 'no-drag'
      } as React.CSSProperties}
    >
      {tabOrder.map((id) => {
        const tab = tabs[id]
        if (!tab) return null
        const isActive = id === activeTabId
        return (
          <div
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 20px',
              fontSize: 13,
              cursor: 'pointer',
              color: isActive ? 'var(--color-fg)' : 'var(--color-fg-muted)',
              background: isActive ? 'var(--color-elevated)' : 'transparent',
              borderBottom: isActive
                ? '2px solid var(--color-accent)'
                : '2px solid transparent',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
              userSelect: 'none'
            }}
          >
            <span
              style={{
                color: 'var(--color-accent)',
                opacity: isActive ? 1 : 0.4,
                fontSize: 14
              }}
            >
              ›_
            </span>
            {tab.title}
            {tabOrder.length > 1 && (
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(id)
                }}
                style={{
                  marginLeft: 4,
                  opacity: 0.4,
                  cursor: 'pointer',
                  fontSize: 16,
                  lineHeight: 1
                }}
              >
                ×
              </span>
            )}
          </div>
        )
      })}
      <button
        onClick={() => createTab()}
        style={{
          background: 'transparent',
          border: '1px dashed var(--color-border)',
          color: 'var(--color-fg-muted)',
          fontSize: 18,
          padding: '6px 14px',
          marginLeft: 6,
          cursor: 'pointer',
          borderRadius: 4,
          lineHeight: 1
        }}
      >
        +
      </button>
    </div>
  )
}
