import { useEffect, useState, useCallback } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef } from 'react'
import { FileItem } from './FileItem'
import { useFileManagerStore } from '@/stores/file-manager-store'

interface FlatEntry {
  name: string
  path: string
  isDirectory: boolean
  depth: number
}

export function FileTree(): JSX.Element {
  const { rootPath, expandedDirs, toggleDir } = useFileManagerStore()
  const [entries, setEntries] = useState<FlatEntry[]>([])
  const parentRef = useRef<HTMLDivElement>(null)

  const loadDir = useCallback(
    async (dirPath: string, depth: number): Promise<FlatEntry[]> => {
      try {
        const items = await window.api.fs.readDir(dirPath)
        const result: FlatEntry[] = []

        for (const item of items) {
          // Skip hidden files
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
    loadDir(rootPath, 0).then(setEntries)
  }, [rootPath, expandedDirs, loadDir])

  // Watch root for changes
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

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 28,
    overscan: 10
  })

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = entries[virtualItem.index]
          return (
            <div
              key={entry.path}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <FileItem
                name={entry.name}
                path={entry.path}
                isDirectory={entry.isDirectory}
                isExpanded={expandedDirs.has(entry.path)}
                depth={entry.depth}
                onClick={() => {
                  if (entry.isDirectory) toggleDir(entry.path)
                }}
                onDoubleClick={() => {
                  // Could cd in terminal or open file
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
