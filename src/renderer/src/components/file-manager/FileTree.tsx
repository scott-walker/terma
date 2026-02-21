import { useEffect, useState, useCallback, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { FileItem } from './FileItem'
import { ContextMenu, type MenuEntry } from '../ui/ContextMenu'
import { useSettingsStore } from '@/stores/settings-store'
import { useToastStore } from '@/stores/toast-store'

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
}

function parentDir(p: string): string {
  const i = p.lastIndexOf('/')
  return i > 0 ? p.substring(0, i) : '/'
}

function baseName(p: string): string {
  return p.substring(p.lastIndexOf('/') + 1)
}

export function FileTree({
  rootPath,
  expandedDirs,
  onToggleDir
}: FileTreeProps): JSX.Element {
  const [entries, setEntries] = useState<FlatEntry[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clipboard, setClipboard] = useState<ClipboardItem[]>([])
  const [contextMenu, setContextMenu] = useState<{
    position: { x: number; y: number }
    path: string
    isDirectory: boolean
  } | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)
  const anchorPath = useRef<string | null>(null)
  const addToast = useToastStore((s) => s.addToast)
  const fontSize = useSettingsStore((s) => s.getEffectiveFontSize())
  const rowHeight = Math.round(fontSize * 1.6)

  const loadDir = useCallback(
    async (dirPath: string, depth: number): Promise<FlatEntry[]> => {
      try {
        const items = await window.api.fs.readDir(dirPath)
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
        return []
      }
    },
    [expandedDirs]
  )

  useEffect(() => {
    loadDir(rootPath, 0).then(setEntries)
  }, [rootPath, expandedDirs, loadDir])

  useEffect(() => {
    window.api.fs.watch(rootPath)
    const unsub = window.api.fs.onFsEvent(() => {
      loadDir(rootPath, 0).then(setEntries)
    })
    return () => {
      window.api.fs.unwatch(rootPath)
      unsub()
    }
  }, [rootPath, loadDir])

  const reload = useCallback(() => {
    loadDir(rootPath, 0).then(setEntries)
  }, [loadDir, rootPath])

  // ── Selection logic ──

  const handleItemClick = useCallback(
    (e: React.MouseEvent, entry: FlatEntry, idx: number) => {
      if (e.shiftKey && anchorPath.current) {
        // Range select from anchor to clicked item
        const anchorIdx = entries.findIndex((en) => en.path === anchorPath.current)
        if (anchorIdx !== -1) {
          const start = Math.min(anchorIdx, idx)
          const end = Math.max(anchorIdx, idx)
          const paths = new Set<string>()
          for (let i = start; i <= end; i++) paths.add(entries[i].path)
          setSelected(paths)
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Toggle individual item
        setSelected((prev) => {
          const next = new Set(prev)
          if (next.has(entry.path)) next.delete(entry.path)
          else next.add(entry.path)
          return next
        })
        anchorPath.current = entry.path
      } else {
        // Plain click — single select
        setSelected(new Set([entry.path]))
        anchorPath.current = entry.path
        if (entry.isDirectory) onToggleDir(entry.path)
      }
    },
    [entries, onToggleDir]
  )

  // ── File operations ──

  const handleCopy = useCallback(() => {
    const items = entries
      .filter((e) => selected.has(e.path))
      .map((e) => ({ path: e.path, isDirectory: e.isDirectory }))
    if (items.length > 0) setClipboard(items)
  }, [entries, selected])

  const handlePaste = useCallback(
    async (targetPath: string, targetIsDirectory: boolean) => {
      if (clipboard.length === 0) return
      const destDir = targetIsDirectory ? targetPath : parentDir(targetPath)
      let ok = 0
      let fail = 0
      for (const item of clipboard) {
        try {
          await window.api.fs.copy(item.path, destDir)
          ok++
        } catch {
          fail++
        }
      }
      reload()
      if (ok > 0) {
        addToast(
          'success',
          ok === 1 ? `Copied "${baseName(clipboard[0].path)}"` : `Copied ${ok} items`
        )
      }
      if (fail > 0) {
        addToast('error', fail === 1 ? 'Copy failed' : `Failed to copy ${fail} items`)
      }
    },
    [clipboard, reload, addToast]
  )

  const handleDelete = useCallback(async () => {
    const paths = Array.from(selected)
    if (paths.length === 0) return
    let ok = 0
    let fail = 0
    for (const p of paths) {
      try {
        await window.api.fs.delete(p)
        ok++
      } catch {
        fail++
      }
    }
    setSelected(new Set())
    reload()
    if (ok > 0) {
      addToast(
        'success',
        ok === 1 ? `Deleted "${baseName(paths[0])}"` : `Deleted ${ok} items`
      )
    }
    if (fail > 0) {
      addToast('error', fail === 1 ? 'Delete failed' : `Failed to delete ${fail} items`)
    }
  }, [selected, reload, addToast])

  // ── Keyboard shortcuts ──

  useEffect(() => {
    const container = parentRef.current
    if (!container) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (selected.size === 0) return

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault()
        handleCopy()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault()
        // Paste into the anchor item's location
        if (anchorPath.current) {
          const entry = entries.find((en) => en.path === anchorPath.current)
          if (entry) handlePaste(entry.path, entry.isDirectory)
        }
      } else if (e.key === 'Delete') {
        e.preventDefault()
        handleDelete()
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [selected, entries, handleCopy, handlePaste, handleDelete])

  // ── Virtualizer ──

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 20
  })

  // ── Context menu ──

  const contextMenuEntries: MenuEntry[] = contextMenu
    ? [
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
          disabled: clipboard.length === 0,
          onAction: () => handlePaste(contextMenu.path, contextMenu.isDirectory)
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
              onDoubleClick={() => {
                if (!entry.isDirectory) {
                  // TODO: open file
                }
              }}
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
