import { useEffect } from 'react'
import { FileTree } from './FileTree'
import { useFileManagerStore } from '@/stores/file-manager-store'

interface FileManagerPaneProps {
  paneId: string
  cwd?: string | null
}

export function FileManagerPane({ paneId, cwd }: FileManagerPaneProps): JSX.Element {
  const pane = useFileManagerStore((s) => s.panes[paneId])
  const initPane = useFileManagerStore((s) => s.initPane)
  const removePane = useFileManagerStore((s) => s.removePane)
  const toggleDir = useFileManagerStore((s) => s.toggleDir)

  useEffect(() => {
    initPane(paneId, cwd ?? undefined)
    return () => removePane(paneId)
  }, [paneId, initPane, removePane])

  if (!pane) return <div className="h-full w-full" />

  const folderName = pane.rootPath.split('/').pop() || pane.rootPath

  return (
    <div className="flex h-full w-full flex-col">
      {/* VS Code style header */}
      <div className="flex shrink-0 items-center border-b border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-fg-muted">
        <span>Explorer</span>
        <span className="mx-1.5 text-fg-muted/50">&mdash;</span>
        <span className="truncate font-normal normal-case tracking-normal">{folderName}</span>
      </div>
      {/* File tree */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          <FileTree
            rootPath={pane.rootPath}
            expandedDirs={pane.expandedDirs}
            onToggleDir={(path) => toggleDir(paneId, path)}
          />
        </div>
      </div>
    </div>
  )
}
