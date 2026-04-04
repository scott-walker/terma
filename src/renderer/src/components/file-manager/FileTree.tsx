import { useEffect, useState, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { FileItem } from './FileItem'
import { ContextMenu, type MenuEntry } from '../ui/ContextMenu'
import { useSettingsStore } from '@/stores/settings-store'
import { useToastStore } from '@/stores/toast-store'
import { matchesGlob } from '@shared/settings'
import { parentDir, baseName } from '@shared/path-utils'
import type { FileEntry } from '@shared/types'

interface FlatEntry {
  name: string
  path: string
  isDirectory: boolean
  depth: number
}

interface ClipboardItem {
  path: string
  isDirectory: boolean
}

interface FileTreeProps {
  rootPath: string
  expandedDirs: Set<string>
  onToggleDir: (path: string) => void
  onNavigateUp?: () => void
  onNavigateToDir?: (path: string) => void
  onOpenInSplit?: (path: string) => void
  onPreviewFile?: (path: string) => void
  onOpenSshTerminal?: (path: string) => void
  onEditRemoteFile?: (filePath: string) => void
  refreshToken?: number
  readDirFn?: (path: string) => Promise<FileEntry[]>
  isRemote?: boolean
}

export function FileTree({
  rootPath,
  expandedDirs,
  onToggleDir,
  onNavigateUp,
  onNavigateToDir,
  onOpenInSplit,
  onPreviewFile,
  onOpenSshTerminal,
  onEditRemoteFile,
  refreshToken,
  readDirFn,
  isRemote = false
}: FileTreeProps): JSX.Element {
  const [entries, setEntries] = useState<FlatEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([])
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number }
    path: string
    isDirectory: boolean
  } | null>(null)
  const [renamingPath, setRenamingPath] = useState<string | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const anchorPath = useRef<string | null>(null)
  const undoStack = useRef<string[][]>([])
  const addToast = useToastStore((s) => s.addToast)
  const fontSize = useSettingsStore((s) => s.settings.fontSize)
  const lineHeight = useSettingsStore((s) => s.settings.lineHeight)
  const fileAssociations = useSettingsStore((s) => s.settings.fileAssociations)
  const rowHeight = Math.round(Math.max(fontSize * lineHeight, fontSize * 1.15) + 6)

  const readDir = readDirFn ?? window.api.fs.readDir

  const loadDir = useCallback(
    async (dirPath: string, depth: number): Promise<FlatEntry[]> => {
      try {
        const items = await readDir(dirPath)
        const result: FlatEntry[] = []

        for (const item of items) {
          result.push({
            name: item.name,
            path: item.path,
            isDirectory: item.isDirectory,
            depth
          })

          if (item.isDirectory && expandedDirs.has(item.path)) {
            const children = await loadDir(item.path, depth + 1)
            result.push(...children)
          }
        }
        return result
      } catch {
        addToast('error', `Failed to read directory: ${dirPath}`)
        return []
      }
    },
    [expandedDirs, readDir]
  )

  const loadTree = useCallback(async () => {
    const items = await loadDir(rootPath, 0)
    if (rootPath !== '/') {
      const parentPath = parentDir(rootPath)
      items.unshift({
        name: '..',
        path: parentPath,
        isDirectory: true,
        depth: 0
      })
    }
    setEntries(items)
  }, [loadDir, rootPath])

  // Stable ref so the watcher effect doesn't re-subscribe on every expand/collapse
  const loadTreeRef = useRef(loadTree)
  loadTreeRef.current = loadTree

  useEffect(() => {
    loadTree()
  }, [loadTree, refreshToken])

  useEffect(() => {
    if (isRemote) return
    window.api.fs.watch(rootPath)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const unsub = window.api.fs.onFsEvent(() => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => loadTreeRef.current(), 150)
    })
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      window.api.fs.unwatch(rootPath)
      unsub()
    }
  }, [rootPath, isRemote])

  // ── Selection logic ──

  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleItemClick = useCallback(
    (e: React.MouseEvent, entry: FlatEntry, idx: number) => {
      if (e.shiftKey && anchorPath.current) {
        const anchorIdx = entries.findIndex((en) => en.path === anchorPath.current)
        if (anchorIdx !== -1) {
          const start = Math.min(anchorIdx, idx)
          const end = Math.max(anchorIdx, idx)
          const paths = new Set<string>()
          for (let i = start; i <= end; i++) paths.add(entries[i].path)
          setSelected(paths)
        }
      } else if (e.ctrlKey || e.metaKey) {
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(entry.path)) next.delete(entry.path)
          else next.add(entry.path)
          return next
        })
        anchorPath.current = entry.path
      } else {
        setSelected(new Set([entry.path]))
        anchorPath.current = entry.path
        if (entry.isDirectory && entry.name !== '..') {
          // Delay toggle so double-click can cancel it
          if (clickTimerRef.current) clearTimeout(clickTimerRef.current)
          clickTimerRef.current = setTimeout(() => {
            clickTimerRef.current = null
            onToggleDir(entry.path)
          }, 250)
        }
      }
    },
    [entries, onToggleDir, onNavigateUp]
  )

  const handleItemDoubleClick = useCallback(
    (entry: FlatEntry) => {
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current)
        clickTimerRef.current = null
      }
      if (entry.name === '..') {
        onNavigateUp?.()
      } else if (entry.isDirectory) {
        onNavigateToDir?.(entry.path)
      } else if (isRemote && !entry.isDirectory && onEditRemoteFile) {
        onEditRemoteFile(entry.path)
      } else if (!isRemote) {
        // Open preview-able files in a preview pane
        if (/\.(md|markdown|png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(entry.name) && onPreviewFile) {
          onPreviewFile(entry.path)
          return
        }
        const match = fileAssociations.find((a) => matchesGlob(entry.name, a.pattern))
        if (match) {
          window.api.shell.openWith(match.command, entry.path)
        } else {
          window.api.shell.openPath(entry.path)
        }
      }
    },
    [onNavigateUp, onNavigateToDir, onEditRemoteFile, onPreviewFile, fileAssociations, isRemote]
  )

  // ── File operations ──

  const handleCopy = useCallback(() => {
    const items = entries
      .filter((e) => selected.has(e.path))
      .map((e) => ({ path: e.path, isDirectory: e.isDirectory }))
    if (items.length > 0) {
      setClipboard(items)
      window.api.clipboard.writeFilePaths(items.map((i) => i.path))
    }
  }, [entries, selected])

  const handlePaste = useCallback(
    async (targetPath: string, targetIsDirectory: boolean, systemPaths?: string[]) => {
      const sources = systemPaths && systemPaths.length > 0
        ? systemPaths.map((p) => ({ path: p }))
        : clipboard.map((item) => ({ path: item.path }))
      if (sources.length === 0) return
      const destDir = targetIsDirectory ? targetPath : parentDir(targetPath)
      let ok = 0
      let fail = 0
      for (const item of sources) {
        try {
          await window.api.fs.copy(item.path, destDir)
          ok++
        } catch {
          fail++
        }
      }
      loadTree()
      if (ok > 0) {
        addToast(
          'success',
          ok === 1 ? `Copied "${baseName(sources[0].path)}"` : `Copied ${ok} items`
        )
      }
      if (fail > 0) {
        addToast('error', fail === 1 ? 'Copy failed' : `Failed to copy ${fail} items`)
      }
    },
    [clipboard, loadTree, addToast]
  )

  const handleDelete = useCallback(async () => {
    const paths = Array.from(selected)
    if (paths.length === 0) return
    const trashed: string[] = []
    let fail = 0
    for (const p of paths) {
      try {
        await window.api.fs.delete(p)
        trashed.push(p)
      } catch {
        fail++
      }
    }
    if (trashed.length > 0) {
      undoStack.current.push(trashed)
    }
    setSelected(new Set())
    loadTree()
    if (trashed.length > 0) {
      addToast(
        'success',
        trashed.length === 1
          ? `Deleted "${baseName(trashed[0])}" — Ctrl+Z to undo`
          : `Deleted ${trashed.length} items — Ctrl+Z to undo`
      )
    }
    if (fail > 0) {
      addToast('error', fail === 1 ? 'Delete failed' : `Failed to delete ${fail} items`)
    }
  }, [selected, loadTree, addToast])

  const handleRestore = useCallback(async () => {
    const paths = undoStack.current.pop()
    if (!paths || paths.length === 0) return
    const { ok, fail } = await window.api.fs.restore(paths)
    loadTree()
    if (ok > 0) {
      addToast(
        'success',
        ok === 1 ? `Restored "${baseName(paths[0])}"` : `Restored ${ok} items`
      )
    }
    if (fail > 0) {
      addToast('error', fail === 1 ? 'Restore failed' : `Failed to restore ${fail} items`)
    }
  }, [loadTree, addToast])

  const handleRenameStart = useCallback(
    (path?: string) => {
      const target = path ?? (selected.size === 1 ? Array.from(selected)[0] : null)
      if (!target) return
      const entry = entries.find((e) => e.path === target)
      if (!entry || entry.name === '..') return
      setRenamingPath(target)
    },
    [selected, entries]
  )

  const handleRenameSubmit = useCallback(
    async (oldPath: string, newName: string) => {
      const dir = parentDir(oldPath)
      const sep = dir.includes('\\') ? '\\' : '/'
      const newPath = dir + sep + newName
      try {
        await window.api.fs.rename(oldPath, newPath)
        setRenamingPath(null)
        loadTree()
        addToast('success', `Renamed to "${newName}"`)
      } catch {
        addToast('error', `Failed to rename "${baseName(oldPath)}"`)
        setRenamingPath(null)
      }
    },
    [loadTree, addToast]
  )

  // ── Drag ──

  const handleDragStart = useCallback(
    (e: React.DragEvent, entry: FlatEntry) => {
      if (isRemote || entry.name === '..') {
        e.preventDefault()
        return
      }
      const paths =
        selected.has(entry.path) && selected.size > 1
          ? entries.filter((en) => selected.has(en.path)).map((en) => en.path)
          : [entry.path]
      e.dataTransfer.setData('application/x-terma-files', JSON.stringify(paths))
      e.dataTransfer.effectAllowed = 'copyMove'
    },
    [entries, selected, isRemote]
  )

  // ── Keyboard shortcuts ──

  useEffect(() => {
    if (isRemote) return
    const container = parentRef.current
    if (!container) return

    const handleKeyDown = async (e: KeyboardEvent): Promise<void> => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
        e.preventDefault()
        handleRestore()
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        e.preventDefault()
        const targetPath = anchorPath.current
          ? entries.find((en) => en.path === anchorPath.current)
          : null
        const destPath = targetPath?.isDirectory ? targetPath.path : rootPath
        if (clipboard.length === 0) {
          const systemPaths = await window.api.clipboard.readFilePaths()
          if (systemPaths.length > 0) {
            handlePaste(destPath, true, systemPaths)
          } else {
            const saved = await window.api.clipboard.saveImage(destPath)
            if (saved) {
              loadTree()
              addToast('success', `Saved "${baseName(saved)}"`)
            }
          }
        } else if (targetPath) {
          handlePaste(targetPath.path, targetPath.isDirectory)
        }
        return
      }

      if (e.key === 'F2' && selected.size === 1 && !renamingPath) {
        e.preventDefault()
        handleRenameStart()
        return
      }

      if (selected.size === 0) return

      if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        e.preventDefault()
        handleCopy()
      } else if (e.key === 'Delete') {
        e.preventDefault()
        handleDelete()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [selected, entries, clipboard, rootPath, handleCopy, handlePaste, handleDelete, handleRestore, handleRenameStart, renamingPath, isRemote])

  // ── Virtualizer ──

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 20
  })

  // Force virtualizer to recalculate when row size changes (zoom / lineHeight)
  useEffect(() => {
    virtualizer.measure()
  }, [rowHeight, virtualizer])

  // ── Context menu ──

  const contextMenuEntries: MenuEntry[] = contextMenu
    ? isRemote
      ? [
          {
            type: 'item',
            label: 'Open SSH terminal here',
            onAction: () => {
              const dir = contextMenu.isDirectory
                ? contextMenu.path
                : parentDir(contextMenu.path)
              onOpenSshTerminal?.(dir)
            }
          },
          { type: 'separator' },
          {
            type: 'item',
            label: 'Open in split pane',
            onAction: () => {
              const dir = contextMenu.isDirectory
                ? contextMenu.path
                : parentDir(contextMenu.path)
              onOpenInSplit?.(dir)
            }
          }
        ]
      : [
          {
            type: 'item',
            label: selected.size > 1 ? `Copy ${selected.size} items` : 'Copy',
            shortcut: 'Ctrl+C',
            onAction: () => handleCopy()
          },
          {
            type: 'item',
            label: clipboard.length > 1 ? `Paste ${clipboard.length} items` : 'Paste',
            shortcut: 'Ctrl+V',
            onAction: async () => {
              if (clipboard.length === 0) {
                const systemPaths = await window.api.clipboard.readFilePaths()
                if (systemPaths.length > 0) {
                  handlePaste(contextMenu.path, contextMenu.isDirectory, systemPaths)
                } else {
                  const destDir = contextMenu.isDirectory ? contextMenu.path : parentDir(contextMenu.path)
                  const saved = await window.api.clipboard.saveImage(destDir)
                  if (saved) {
                    loadTree()
                    addToast('success', `Saved "${baseName(saved)}"`)
                  }
                }
              } else {
                handlePaste(contextMenu.path, contextMenu.isDirectory)
              }
            }
          },
          {
            type: 'item',
            label: 'Rename',
            shortcut: 'F2',
            disabled: selected.size > 1,
            onAction: () => handleRenameStart(contextMenu.path)
          },
          { type: 'separator' },
          {
            type: 'item',
            label: 'Open in file manager',
            onAction: () => {
              const dir = contextMenu.isDirectory
                ? contextMenu.path
                : parentDir(contextMenu.path)
              window.api.shell.openPath(dir)
            }
          },
          {
            type: 'item',
            label: 'Open in split pane',
            onAction: () => {
              const dir = contextMenu.isDirectory
                ? contextMenu.path
                : parentDir(contextMenu.path)
              onOpenInSplit?.(dir)
            }
          },
          { type: 'separator' },
          {
            type: 'item',
            label: selected.size > 1 ? `Delete ${selected.size} items` : 'Delete',
            shortcut: 'Del',
            onAction: () => handleDelete()
          }
        ]
    : []

  return (
    <div ref={parentRef} className="relative h-full select-none overflow-auto" tabIndex={0}>
      <div
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        className="relative w-full"
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = entries[virtualItem.index]
          return (
            <FileItem
              key={entry.path}
              name={entry.name}
              path={entry.path}
              isDirectory={entry.isDirectory}
              isExpanded={expandedDirs.has(entry.path)}
              isSelected={selected.has(entry.path)}
              isRenaming={renamingPath === entry.path}
              depth={entry.depth}
              fontSize={fontSize}
              rowHeight={rowHeight}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: `translateY(${virtualItem.start}px)`
              }}
              onClick={(e) => handleItemClick(e, entry, virtualItem.index)}
              onDoubleClick={() => handleItemDoubleClick(entry)}
              onDragStart={(e) => handleDragStart(e, entry)}
              onRenameSubmit={(newName) => handleRenameSubmit(entry.path, newName)}
              onRenameCancel={() => setRenamingPath(null)}
              onContextMenu={(e) => {
                e.preventDefault()
                // If right-clicking outside current selection, select only this item
                if (!selected.has(entry.path)) {
                  setSelected(new Set([entry.path]))
                  anchorPath.current = entry.path
                }
                setContextMenu({
                  position: { x: e.clientX, y: e.clientY },
                  path: entry.path,
                  isDirectory: entry.isDirectory
                })
              }}
            />
          )
        })}
      </div>

      <ContextMenu
        position={contextMenu?.position ?? null}
        entries={contextMenuEntries}
        onClose={() => setContextMenu(null)}
      />
    </div>
  )
}
