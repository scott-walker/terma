import { useEffect, useState, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import { parentDir, baseName, normalizePath, isAbsolute } from '@shared/path-utils'
import { useSettingsStore } from '../../stores/settings-store'
import { useTabStore } from '../../stores/tab-store'

interface MarkdownPaneProps {
  tabId: string
  paneId: string
  filePath: string
}

function resolveRelative(base: string, href: string): string {
  if (isAbsolute(href)) return href
  return normalizePath(parentDir(base) + '/' + href)
}

function isLocalLink(href: string): boolean {
  return !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('#')
}

function MdImage({ src, alt, filePath }: { src?: string; alt?: string; filePath: string }): JSX.Element {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!src) return
    const resolved = resolveRelative(filePath, src)
    window.api.fs.readFileAsDataUrl(resolved)
      .then(setDataUrl)
      .catch(() => setDataUrl(null))
  }, [src, filePath])

  if (!src) return <span />
  if (dataUrl) return <img src={dataUrl} alt={alt ?? ''} className="mb-4 max-w-full rounded-md" />
  return <img src={src} alt={alt ?? ''} className="mb-4 max-w-full rounded-md" />
}

export function MarkdownPane({ tabId, paneId, filePath }: MarkdownPaneProps): JSX.Element {
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const filePathRef = useRef(filePath)
  filePathRef.current = filePath

  const backStack = useRef<string[]>([])
  const forwardStack = useRef<string[]>([])
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const navFlag = useRef(false)

  const fontFamily = useSettingsStore((s) => s.settings.fontFamily)
  const effectiveFontSize = useSettingsStore((s) => s.settings.fontSize)

  const prevFilePath = useRef(filePath)
  useEffect(() => {
    if (prevFilePath.current !== filePath && !navFlag.current) {
      backStack.current.push(prevFilePath.current)
      forwardStack.current = []
      setCanGoBack(true)
      setCanGoForward(false)
    }
    navFlag.current = false
    prevFilePath.current = filePath
  }, [filePath])

  const loadFile = useCallback(async () => {
    try {
      const text = await window.api.fs.readFile(filePathRef.current)
      setContent(text)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    }
  }, [])

  useEffect(() => {
    loadFile()
  }, [loadFile, filePath])

  // Watch for file changes
  useEffect(() => {
    const dir = parentDir(filePath)
    const fileName = baseName(filePath)

    window.api.fs.watch(dir)
    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const unsub = window.api.fs.onFsEvent((event) => {
      if (event.path === filePath || event.path.endsWith('/' + fileName)) {
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(loadFile, 200)
      }
    })

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      window.api.fs.unwatch(dir)
      unsub()
    }
  }, [filePath, loadFile])

  const navigateTo = useCallback(
    (target: string) => {
      useTabStore.getState().updatePaneCwd(tabId, paneId, target)
    },
    [tabId, paneId]
  )

  const goBack = useCallback(() => {
    const prev = backStack.current.pop()
    if (!prev) return
    forwardStack.current.push(filePath)
    navFlag.current = true
    setCanGoBack(backStack.current.length > 0)
    setCanGoForward(true)
    navigateTo(prev)
  }, [filePath, navigateTo])

  const goForward = useCallback(() => {
    const next = forwardStack.current.pop()
    if (!next) return
    backStack.current.push(filePath)
    navFlag.current = true
    setCanGoBack(true)
    setCanGoForward(forwardStack.current.length > 0)
    navigateTo(next)
  }, [filePath, navigateTo])

  const handleLinkClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      e.preventDefault()
      if (isLocalLink(href)) {
        const resolved = resolveRelative(filePath, href)
        if (/\.(md|markdown)$/i.test(resolved)) {
          navigateTo(resolved)
        } else if (/\.(png|jpe?g|gif|webp|svg|bmp|ico|avif)$/i.test(resolved)) {
          useTabStore.getState().openRightPane(tabId, 'image', resolved)
        } else {
          window.api.shell.openPath(resolved)
        }
      } else {
        window.api.shell.openPath(href)
      }
    },
    [filePath, tabId, navigateTo]
  )

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-sm text-danger">
        {error}
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col" style={{ fontFamily, fontSize: effectiveFontSize }}>
      {(canGoBack || canGoForward) && (
        <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
          <button
            onClick={goBack}
            disabled={!canGoBack}
            className="flex h-6 w-6 items-center justify-center rounded text-fg-secondary transition-colors hover:bg-surface hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-secondary"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            onClick={goForward}
            disabled={!canGoForward}
            className="flex h-6 w-6 items-center justify-center rounded text-fg-secondary transition-colors hover:bg-surface hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-fg-secondary"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <span className="ml-1 truncate text-[0.8em] text-fg-muted">{baseName(filePath)}</span>
        </div>
      )}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-4 mt-6 border-b border-border pb-2 text-[1.5em] font-bold text-fg first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="mb-3 mt-6 border-b border-border pb-1.5 text-[1.25em] font-semibold text-fg first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="mb-2 mt-5 text-[1.125em] font-semibold text-fg first:mt-0">{children}</h3>
              ),
              h4: ({ children }) => (
                <h4 className="mb-2 mt-4 font-semibold text-fg first:mt-0">{children}</h4>
              ),
              p: ({ children }) => (
                <p className="mb-4 leading-relaxed text-fg-secondary">{children}</p>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-info underline decoration-info/30 hover:decoration-info/60 cursor-pointer"
                  onClick={(e) => href && handleLinkClick(e, href)}
                >
                  {children}
                </a>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 ml-6 list-disc text-fg-secondary">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="mb-4 ml-6 list-decimal text-fg-secondary">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="mb-1 leading-relaxed">{children}</li>
              ),
              blockquote: ({ children }) => (
                <blockquote className="mb-4 border-l-4 border-accent/40 pl-4 text-fg-muted italic">{children}</blockquote>
              ),
              code: ({ className, children }) => {
                const isBlock = className?.startsWith('language-')
                if (isBlock) {
                  return (
                    <code className="block text-[0.875em] leading-relaxed text-fg">{children}</code>
                  )
                }
                return (
                  <code className="rounded bg-surface px-1.5 py-0.5 text-[0.875em] text-info">{children}</code>
                )
              },
              pre: ({ children }) => (
                <pre className="mb-4 overflow-x-auto rounded-md bg-surface p-4">{children}</pre>
              ),
              table: ({ children }) => (
                <div className="mb-4 overflow-x-auto">
                  <table className="w-full border-collapse text-[0.875em]">{children}</table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="border-b border-border">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-3 py-2 text-left font-semibold text-fg">{children}</th>
              ),
              td: ({ children }) => (
                <td className="border-t border-border px-3 py-2 text-fg-secondary">{children}</td>
              ),
              hr: () => (
                <hr className="my-6 border-border" />
              ),
              img: ({ src, alt }) => (
                <MdImage src={src} alt={alt} filePath={filePath} />
              ),
              input: ({ checked, ...rest }) => (
                <input {...rest} checked={checked ?? false} readOnly className="mr-2 accent-accent" type="checkbox" />
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}
