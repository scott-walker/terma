import { useEffect, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'

interface FlatEntry {
  name: string
  path: string
  isDirectory: boolean
  depth: number
}

interface FileTreeProps {
  rootPath: string
  expandedDirs: Set<string>
  onToggleDir: (path: string) => void
  onEntriesChange?: (count: number) => void
}

export function FileTree({
  rootPath,
  expandedDirs,
  onToggleDir,
  onEntriesChange
}: FileTreeProps): JSX.Element {
  const [entries, setEntries] = useState<FlatEntry[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const parentRef = useRef<HTMLDivElement>(null)

  const loadDir = useCallback(
    async (dirPath: string, depth: number): Promise<FlatEntry[]> => {
      try {
        const items = await window.api.fs.readDir(dirPath)
        const result: FlatEntry[] = []

        for (const item of items) {
          if (item.name.startsWith('.')) continue

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
    loadDir(rootPath, 0).then((result) => {
      setEntries(result)
      onEntriesChange?.(result.length)
    })
  }, [rootPath, expandedDirs, loadDir, onEntriesChange])

  useEffect(() => {
    window.api.fs.watch(rootPath)
    const unsub = window.api.fs.onFsEvent(() => {
      loadDir(rootPath, 0).then((result) => {
        setEntries(result)
        onEntriesChange?.(result.length)
      })
    })
    return () => {
      window.api.fs.unwatch(rootPath)
      unsub()
    }
  }, [rootPath, loadDir, onEntriesChange])

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 32,
    overscan: 10
  })

  return (
    <div ref={parentRef} className="h-full overflow-auto py-1.5">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px` }}
        className="relative w-full"
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = entries[virtualItem.index]
          const isSelected = selected === virtualItem.index
          return (
            <div
              key={entry.path}
              onClick={() => {
                setSelected(virtualItem.index)
                if (entry.isDirectory) onToggleDir(entry.path)
              }}
              className={`absolute left-0 top-0 flex w-full cursor-pointer items-center justify-between px-4 py-1.5 text-[13px] transition-[background] duration-100 ${
                entry.isDirectory ? 'text-directory' : 'text-fg'
              } ${isSelected ? 'bg-elevated' : 'bg-transparent'}`}
              style={{
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
                paddingLeft: `${entry.depth * 18 + 16}px`
              }}
            >
              <span>
                <span className="mr-2.5 opacity-50">
                  {entry.isDirectory
                    ? expandedDirs.has(entry.path)
                      ? '▾'
                      : '▸'
                    : '\u00A0'}
                </span>
                {entry.isDirectory ? entry.name + '/' : entry.name}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
