import { Columns2, Rows2, X } from 'lucide-react'
import type { PaneType } from '@/lib/layout-tree'
import { PANE_TYPE_CONFIGS } from '@/lib/pane-types'
import { useTabStore } from '@/stores/tab-store'

interface PaneHeaderProps {
  tabId: string
  paneId: string
  paneType: PaneType
}

const paneTypes = Object.keys(PANE_TYPE_CONFIGS) as PaneType[]

export function PaneHeader({ tabId, paneId, paneType }: PaneHeaderProps): JSX.Element {
  const config = PANE_TYPE_CONFIGS[paneType] ?? PANE_TYPE_CONFIGS.terminal
  const Icon = config.icon

  return (
    <div
      className="flex shrink-0 items-center justify-between border-b border-border bg-elevated"
      style={{ padding: '8px 14px', gap: 10 }}
    >
      {/* Left: icon + type tabs */}
      <div className="flex items-center" style={{ gap: 10 }}>
        <Icon size={16} style={{ color: config.color, opacity: 0.9 }} />

        {/* Type switcher — colored tabs */}
        <div className="flex" style={{ gap: 3 }}>
          {paneTypes.map((pt) => {
            const ptConfig = PANE_TYPE_CONFIGS[pt]
            const isActive = pt === paneType
            return (
              <button
                key={pt}
                onClick={(e) => {
                  e.stopPropagation()
                  if (!isActive) useTabStore.getState().setPaneType(tabId, paneId, pt)
                }}
                style={{
                  background: isActive ? ptConfig.color + '22' : 'transparent',
                  border: isActive
                    ? `1px solid ${ptConfig.color}44`
                    : '1px solid transparent',
                  color: isActive ? ptConfig.color : undefined,
                  fontSize: 12,
                  padding: '3px 10px',
                  borderRadius: 4,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                className={!isActive ? 'text-fg-muted' : ''}
              >
                {ptConfig.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: split + close */}
      <div className="flex" style={{ gap: 6 }}>
        <button
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().splitPane(tabId, paneId, 'horizontal')
          }}
          title="Split horizontal"
          className="text-fg-muted"
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px 6px',
            borderRadius: 4,
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          <Columns2 size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().splitPane(tabId, paneId, 'vertical')
          }}
          title="Split vertical"
          className="text-fg-muted"
          style={{
            background: 'transparent',
            border: 'none',
            padding: '4px 6px',
            borderRadius: 4,
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          <Rows2 size={16} />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().closePane(tabId, paneId)
          }}
          title="Close pane"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ef4444',
            padding: '4px 6px',
            borderRadius: 4,
            cursor: 'pointer',
            lineHeight: 1
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
