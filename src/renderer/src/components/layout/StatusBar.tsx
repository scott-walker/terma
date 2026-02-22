import { useCallback } from 'react'
import { ClipboardCopy } from 'lucide-react'
import { useTabStore } from '@/stores/tab-store'
import { useToastStore } from '@/stores/toast-store'
import { getAllPaneIds, findNode } from '@/lib/layout-tree'

export function StatusBar(): JSX.Element {
  const activeTab = useTabStore((s) => (s.activeTabId ? s.tabs[s.activeTabId] : null))
  const addToast = useToastStore((s) => s.addToast)

  const paneCount = activeTab ? getAllPaneIds(activeTab.layoutTree).length : 0

  let activeCwd: string | null = null
  if (activeTab) {
    const node = findNode(activeTab.layoutTree, activeTab.activePaneId)
    if (node && node.type === 'pane') {
      activeCwd = node.cwd
    }
  }

  const handleCopyLogs = useCallback(async () => {
    try {
      const entries = await window.api.log.getLogs()
      const text = entries
        .map((e) => {
          const ts = new Date(e.timestamp).toISOString()
          const data = e.data !== undefined ? ' ' + JSON.stringify(e.data) : ''
          return `[${ts}] [${e.level.toUpperCase()}] [${e.source}] ${e.message}${data}`
        })
        .join('\n')
      await navigator.clipboard.writeText(text)
      addToast('success', 'Logs copied')
    } catch {
      addToast('error', 'Failed to copy logs')
    }
  }, [addToast])

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border px-4 py-2 text-sm text-fg-muted">
      <div className="min-w-0 flex-1">
        {activeCwd && <span className="truncate">{activeCwd}</span>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span>{paneCount} panes</span>
        <button
          onClick={handleCopyLogs}
          title="Copy logs to clipboard"
          className="cursor-pointer text-fg-muted transition-colors hover:text-fg"
        >
          <ClipboardCopy size={14} />
        </button>
      </div>
    </div>
  )
}
