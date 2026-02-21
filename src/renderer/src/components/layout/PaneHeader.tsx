import { Columns2, Rows2, X } from 'lucide-react'
import type { PaneType } from '@/lib/layout-tree'
import { PANE_TYPE_CONFIGS } from '@/lib/pane-types'
import { useTabStore } from '@/stores/tab-store'
import { IconButton } from '@/components/ui/IconButton'

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
    <div className="flex shrink-0 items-center justify-between gap-2.5 border-b border-border bg-elevated px-3.5 py-2">
      {/* Left: icon + type tabs */}
      <div className="flex items-center gap-2.5">
        <Icon size={16} className={`${config.colorClass} opacity-90`} />

        {/* Type switcher — colored tabs */}
        <div className="flex gap-0.5">
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
                className={`pane-type-pill ${
                  isActive
                    ? `${ptConfig.bgActiveClass} ${ptConfig.borderActiveClass} ${ptConfig.colorClass}`
                    : 'text-fg-muted'
                }`}
              >
                {ptConfig.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: split + close */}
      <div className="flex gap-1.5">
        <IconButton
          icon={Columns2}
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().splitPane(tabId, paneId, 'horizontal')
          }}
          title="Split horizontal"
        />
        <IconButton
          icon={Rows2}
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().splitPane(tabId, paneId, 'vertical')
          }}
          title="Split vertical"
        />
        <IconButton
          icon={X}
          onClick={(e) => {
            e.stopPropagation()
            useTabStore.getState().closePane(tabId, paneId)
          }}
          title="Close pane"
          variant="danger"
        />
      </div>
    </div>
  )
}
