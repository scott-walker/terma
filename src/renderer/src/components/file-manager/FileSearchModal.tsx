import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2, Folder } from 'lucide-react'
import { FileTypeIcon } from './FileTypeIcon'
import { parentDir } from '@shared/path-utils'

const SKIP_DIRS = new Set(['node_modules', '.git', '.hg', '.svn', '__pycache__', '.cache', '.bun'])
const MAX_DEPTH = 20
const MAX_RESULTS = 100

interface FileSearchModalProps {
  rootPath: string
  onClose: () => void
  onSelect: (path: string, isDirectory: boolean) => void
}

interface SearchResult {
  name: string
  path: string
  isDirectory: boolean
}

async function collectFiles(
  rootDir: string,
  query: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const lowerQuery = query.toLowerCase()
  const results: SearchResult[] = []

  const walk = async (dir: string, depth: number): Promise<void> => {
    if (signal.aborted || depth > MAX_DEPTH || results.length >= MAX_RESULTS) return

    let entries: import('@shared/types').FileEntry[]
    try {
      entries = await window.api.fs.readDir(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      if (signal.aborted || results.length >= MAX_RESULTS) return

      if (entry.isDirectory && SKIP_DIRS.has(entry.name)) continue

      if (entry.name.toLowerCase().includes(lowerQuery)) {
        results.push({
          name: entry.name,
          path: entry.path,
          isDirectory: entry.isDirectory
        })
      }

      if (entry.isDirectory) {
        await walk(entry.path, depth + 1)
      }
    }
  }

  await walk(rootDir, 0)
  return results
}

export function FileSearchModal({ rootPath, onClose, onSelect }: FileSearchModalProps): JSX.Element {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isSearching, setIsSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController>()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    abortRef.current?.abort()

    if (!query.trim()) {
      setResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(async () => {
      try {
        const items = await collectFiles(rootPath, query.trim(), controller.signal)
        if (!controller.signal.aborted) {
          setResults(items)
          setSelectedIndex(0)
          setIsSearching(false)
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults([])
          setIsSearching(false)
        }
      }
    }, 200)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, rootPath])

  const handleSelect = useCallback((result: SearchResult) => {
    onSelect(result.path, result.isDirectory)
    onClose()
  }, [onSelect, onClose])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex])
      }
    }
  }, [results, selectedIndex, onClose, handleSelect])

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const item = list.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [onClose])

  const relativePath = (fullPath: string): string => {
    const dir = parentDir(fullPath)
    if (dir.startsWith(rootPath)) {
      const rel = dir.slice(rootPath.length)
      return rel.startsWith('/') ? rel.slice(1) : rel
    }
    return dir
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-backdrop pt-[15vh]"
      onMouseDown={onClose}
    >
      <div
        className="flex h-fit max-h-[60vh] w-[560px] flex-col overflow-hidden rounded-lg bg-popup-bg shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Root path indicator */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Folder size={12} strokeWidth={1.8} className="shrink-0 text-fg-muted" />
          <span className="truncate text-xs text-fg-muted">{rootPath}</span>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={16} strokeWidth={1.8} className="shrink-0 text-fg-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search files..."
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-sm text-fg outline-none placeholder:text-fg-muted"
          />
          {isSearching && (
            <Loader2 size={16} strokeWidth={1.8} className="shrink-0 animate-spin text-fg-muted" />
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="overflow-y-auto">
          {results.length === 0 && query.trim() && !isSearching && (
            <div className="px-4 py-8 text-center text-sm text-fg-muted">
              No files found
            </div>
          )}
          {results.map((result, index) => {
            const rel = relativePath(result.path)
            return (
              <button
                key={result.path}
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors ${
                  index === selectedIndex ? 'bg-surface-hover' : ''
                }`}
              >
                <FileTypeIcon name={result.name} isDirectory={result.isDirectory} size={16} />
                <span className="truncate text-sm text-fg">{result.name}</span>
                {rel && (
                  <span className="ml-auto truncate text-xs text-fg-muted">{rel}</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
