import { useRef, useEffect, useState, useCallback, memo } from 'react'
import { attach, detach, focus, getTerminal, getPtyId } from '@/lib/terminal-manager'
import { useTabStore } from '@/stores/tab-store'
import { ContextMenu, type MenuEntry } from '@/components/ui/ContextMenu'

const MIME_FILES = 'application/x-terma-files'

function relativePath(from: string, to: string): string {
  const fromParts = from.split('/').filter(Boolean)
  const toParts = to.split('/').filter(Boolean)
  let i = 0
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) i++
  const ups = fromParts.length - i
  const rest = toParts.slice(i)
  const rel = [...Array<string>(ups).fill('..'), ...rest].join('/')
  if (!rel) return '.'
  if (!rel.startsWith('.')) return './' + rel
  return rel
}

function shellEscape(s: string): string {
  if (/^[a-zA-Z0-9._\-/=@:]+$/.test(s)) return s
  return "'" + s.replace(/'/g, "'\\''") + "'"
}

interface TerminalPaneProps {
  tabId: string
  paneId: string
  terminalKey?: string
  active: boolean
  cwd?: string | null
  command?: string
  args?: string[]
}

export const TerminalPane = memo(function TerminalPane({ tabId, paneId, terminalKey, active, cwd, command, args }: TerminalPaneProps): JSX.Element {
  const tmKey = terminalKey ?? paneId
  const containerRef = useRef<HTMLDivElement>(null)
  const setPaneTerminal = useTabStore((s) => s.setPaneTerminal)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [hasSelection, setHasSelection] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    attach(tmKey, container, { cwd, command, args }).then((ptyId) => {
      if (ptyId) {
        setPaneTerminal(tabId, paneId, ptyId)
      }
    })

    return () => {
      detach(tmKey)
    }
  }, [tmKey])

  // Focus/refit when pane becomes active
  const isAgent = tmKey.endsWith(':agent')
  useEffect(() => {
    if (active) {
      focus(tmKey)
    }
  }, [active, tmKey])

  // Poll terminal CWD and sync to layout tree
  const updatePaneCwd = useTabStore((s) => s.updatePaneCwd)
  const lastCwdRef = useRef<string | null>(null)

  useEffect(() => {
    const poll = async (): Promise<void> => {
      const ptyId = getPtyId(tmKey)
      if (!ptyId) return
      try {
        const current = await window.api.pty.getCwd(ptyId)
        if (current && current !== lastCwdRef.current) {
          lastCwdRef.current = current
          updatePaneCwd(tabId, paneId, current)
        }
      } catch {
        // PTY may have exited
      }
    }
    poll()
    const interval = setInterval(poll, 2000)
    return () => clearInterval(interval)
  }, [tmKey, tabId, updatePaneCwd])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const terminal = getTerminal(tmKey)
      setHasSelection(!!terminal?.hasSelection())
      setMenuPosition({ x: e.clientX, y: e.clientY })
    },
    [tmKey]
  )

  const handleCopy = useCallback(async () => {
    const terminal = getTerminal(tmKey)
    const selection = terminal?.getSelection()
    if (selection) {
      await navigator.clipboard.writeText(selection)
    }
  }, [tmKey])

  const handlePaste = useCallback(async () => {
    const ptyId = getPtyId(tmKey)
    if (!ptyId) return
    const text = await navigator.clipboard.readText()
    if (text) {
      window.api.pty.write(ptyId, text)
    }
  }, [tmKey])

  // ── Drag-and-drop file paths ──

  const [dragOver, setDragOver] = useState(false)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(MIME_FILES) || e.dataTransfer.types.includes('Files')) {
      useTabStore.getState().setActivePaneId(tabId, paneId)
    }
  }, [tabId, paneId])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(MIME_FILES) || e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const container = e.currentTarget as HTMLElement
    const related = e.relatedTarget as Node | null
    if (!related || !container.contains(related)) {
      setDragOver(false)
    }
  }, [])

  const handleFileDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)

      const ptyId = getPtyId(tmKey)
      if (!ptyId) return

      let paths: string[] = []

      // Internal file manager drag
      const raw = e.dataTransfer.getData(MIME_FILES)
      if (raw) {
        paths = JSON.parse(raw)
      }

      // Native OS file drop
      if (paths.length === 0 && e.dataTransfer.files.length > 0) {
        paths = Array.from(e.dataTransfer.files).map((f) => (f as unknown as { path: string }).path)
      }

      if (paths.length === 0) return

      const cwd = await window.api.pty.getCwd(ptyId)
      if (!cwd) return

      const text = isAgent
        ? paths.map((p) => '@' + relativePath(cwd, p)).join(' ')
        : paths.map((p) => shellEscape(relativePath(cwd, p))).join(' ')
      window.api.pty.write(ptyId, text)
    },
    [tmKey]
  )

  const handleOpenExternal = useCallback(async () => {
    const ptyId = getPtyId(tmKey)
    if (!ptyId) return
    const cwdPath = await window.api.pty.getCwd(ptyId)
    if (cwdPath) {
      window.api.shell.openPath(cwdPath)
    }
  }, [tmKey])

  const handleOpenFiles = useCallback(async () => {
    const ptyId = getPtyId(tmKey)
    if (!ptyId) return
    const cwdPath = await window.api.pty.getCwd(ptyId)
    if (cwdPath) {
      useTabStore.getState().splitPaneWithType(tabId, paneId, 'vertical', 'file-manager', cwdPath)
    }
  }, [tabId, paneId, tmKey])

  const menuEntries: MenuEntry[] = [
    {
      type: 'item',
      label: 'Copy',
      shortcut: 'Ctrl+Shift+C',
      disabled: !hasSelection,
      onAction: handleCopy
    },
    {
      type: 'item',
      label: 'Paste',
      shortcut: 'Ctrl+Shift+V',
      onAction: handlePaste
    },
    { type: 'separator' },
    {
      type: 'item',
      label: 'Show Files',
      shortcut: 'Ctrl+Shift+B',
      onAction: handleOpenFiles
    },
    {
      type: 'item',
      label: 'Open External',
      onAction: handleOpenExternal
    }
  ]

  return (
    <>
      <div
        ref={containerRef}
        onContextMenu={handleContextMenu}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleFileDrop}
        className={`h-full w-full px-2 py-1 ${dragOver ? 'ring-2 ring-inset ring-accent' : ''}`}
      />
      <ContextMenu
        position={menuPosition}
        entries={menuEntries}
        onClose={() => setMenuPosition(null)}
      />
    </>
  )
})
