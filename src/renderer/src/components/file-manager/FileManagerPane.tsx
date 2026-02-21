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
      <div
        className="shrink-0 text-fg-muted"
        style={{
          padding: '8px 16px 10px',
          fontSize: 12,
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between'
        }}
      >
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
