import { useEffect, useState } from 'react'
import { FileTree } from './FileTree'
import { useFileManagerStore } from '@/stores/file-manager-store'

interface FileManagerPaneProps {
  paneId: string
}

export function FileManagerPane({ paneId }: FileManagerPaneProps): JSX.Element {
  const pane = useFileManagerStore((s) => s.panes[paneId])
  const initPane = useFileManagerStore((s) => s.initPane)
  const removePane = useFileManagerStore((s) => s.removePane)
  const toggleDir = useFileManagerStore((s) => s.toggleDir)
  const [entryCount, setEntryCount] = useState(0)

  useEffect(() => {
    initPane(paneId)
    return () => removePane(paneId)
  }, [paneId, initPane, removePane])

  if (!pane) return <div className="h-full w-full" />

  return (
    <div className="flex h-full w-full flex-col">
      {/* Path header */}
      <div className="flex shrink-0 justify-between border-b border-border px-4 pb-2.5 pt-2 text-xs text-fg-muted">
        <span>{pane.rootPath}</span>
        <span>{entryCount} items</span>
      </div>
      {/* File tree */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          <FileTree
            rootPath={pane.rootPath}
            expandedDirs={pane.expandedDirs}
            onToggleDir={(path) => toggleDir(paneId, path)}
            onEntriesChange={setEntryCount}
          />
        </div>
      </div>
    </div>
  )
}
