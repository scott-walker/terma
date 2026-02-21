import { useEffect, useState, useRef, useCallback } from 'react'
import { FileTree } from './FileTree'
import { useFileManagerStore } from '@/stores/file-manager-store'
import { useTabStore } from '@/stores/tab-store'
import { useToastStore } from '@/stores/toast-store'

interface FileManagerPaneProps {
  tabId: string
  paneId: string
  cwd?: string | null
}

export function FileManagerPane({ tabId, paneId, cwd }: FileManagerPaneProps): JSX.Element {
  const pane = useFileManagerStore((s) => s.panes[paneId])
  const initPane = useFileManagerStore((s) => s.initPane)
  const removePane = useFileManagerStore((s) => s.removePane)
  const setRootPath = useFileManagerStore((s) => s.setRootPath)
  const toggleDir = useFileManagerStore((s) => s.toggleDir)
  const updatePaneCwd = useTabStore((s) => s.updatePaneCwd)
  const addToast = useToastStore((s) => s.addToast)

  const [pathInput, setPathInput] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    initPane(paneId, cwd ?? undefined)
    return () => removePane(paneId)
  }, [paneId, initPane, removePane])

  useEffect(() => {
    if (pane && !isEditing) {
      setPathInput(pane.rootPath)
    }
  }, [pane?.rootPath, isEditing])

  const navigateTo = useCallback(
    async (path: string) => {
      const trimmed = path.trim()
      if (!trimmed) return
      const normalized = trimmed === '/' ? '/' : trimmed.replace(/\/+$/, '')
      try {
        const items = await window.api.fs.readDir(normalized)
        if (items !== undefined) {
          setRootPath(paneId, normalized)
          updatePaneCwd(tabId, paneId, normalized)
          setIsEditing(false)
          inputRef.current?.blur()
        }
      } catch {
        addToast('error', `Directory not found: ${normalized}`)
      }
    },
    [paneId, tabId, setRootPath, updatePaneCwd, addToast]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        navigateTo(pathInput)
      } else if (e.key === 'Escape') {
        setPathInput(pane?.rootPath ?? '')
        setIsEditing(false)
        inputRef.current?.blur()
      }
    },
    [pathInput, navigateTo, pane?.rootPath]
  )

  const handleNavigateToDir = useCallback(
    (path: string) => {
      setRootPath(paneId, path)
      updatePaneCwd(tabId, paneId, path)
    },
    [paneId, tabId, setRootPath, updatePaneCwd]
  )

  const handleNavigateUp = useCallback(() => {
    if (!pane || pane.rootPath === '/') return
    const parent = pane.rootPath.substring(0, pane.rootPath.lastIndexOf('/')) || '/'
    setRootPath(paneId, parent)
    updatePaneCwd(tabId, paneId, parent)
  }, [pane?.rootPath, paneId, tabId, setRootPath, updatePaneCwd])

  if (!pane) return <div className="h-full w-full" />

  return (
    <div className="flex h-full w-full flex-col">
      {/* Path bar */}
      <div className="flex shrink-0 items-center border-b border-border">
        <input
          ref={inputRef}
          type="text"
          value={pathInput}
          onChange={(e) => setPathInput(e.target.value)}
          onFocus={() => setIsEditing(true)}
          onBlur={() => {
            setIsEditing(false)
            setPathInput(pane.rootPath)
          }}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-[12px] text-fg outline-none placeholder:text-fg-muted"
          placeholder="/"
        />
      </div>
      {/* File tree */}
      <div className="relative flex-1">
        <div className="absolute inset-0">
          <FileTree
            rootPath={pane.rootPath}
            expandedDirs={pane.expandedDirs}
            onToggleDir={(path) => toggleDir(paneId, path)}
            onNavigateUp={handleNavigateUp}
            onNavigateToDir={handleNavigateToDir}
          />
        </div>
      </div>
    </div>
  )
}
