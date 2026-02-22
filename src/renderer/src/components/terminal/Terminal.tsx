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
  active: boolean
  cwd?: string | null
}

export const TerminalPane = memo(function TerminalPane({ tabId, paneId, active, cwd }: TerminalPaneProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const setPaneTerminal = useTabStore((s) => s.setPaneTerminal)
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null)
  const [hasSelection, setHasSelection] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    attach(paneId, container, { cwd }).then((ptyId) => {
      if (ptyId) {
        setPaneTerminal(tabId, paneId, ptyId)
      }
    })

    return () => {
      detach(paneId)
    }
  }, [paneId])

  // Focus/refit when pane becomes active
  useEffect(() => {
    if (active) {
      focus(paneId)
    }
  }, [active, paneId])

  // Poll terminal CWD and sync to layout tree
  const updatePaneCwd = useTabStore((s) => s.updatePaneCwd)
  const lastCwdRef = useRef<string | null>(null)

  useEffect(() => {
    const poll = async (): Promise<void> => {
      const ptyId = getPtyId(paneId)
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
  }, [paneId, tabId, updatePaneCwd])

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      const terminal = getTerminal(paneId)
      setHasSelection(!!terminal?.hasSelection())
      setMenuPosition({ x: e.clientX, y: e.clientY })
    },
    [paneId]
  )

  const handleCopy = useCallback(async () => {
    const terminal = getTerminal(paneId)
    const selection = terminal?.getSelection()
    if (selection) {
      await navigator.clipboard.writeText(selection)
    }
  }, [paneId])

  const handlePaste = useCallback(async () => {
    const ptyId = getPtyId(paneId)
    if (!ptyId) return
    const text = await navigator.clipboard.readText()
    if (text) {
      window.api.pty.write(ptyId, text)
    }
  }, [paneId])

  // ── Drag-and-drop file paths ──

  const [dragOver, setDragOver] = useState(false)

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

      const ptyId = getPtyId(paneId)
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

      const escaped = paths.map((p) => shellEscape(relativePath(cwd, p))).join(' ')
      window.api.pty.write(ptyId, escaped)
    },
    [paneId]
  )

  const handleOpenExternal = useCallback(async () => {
    const ptyId = getPtyId(paneId)
    if (!ptyId) return
    const cwdPath = await window.api.pty.getCwd(ptyId)
    if (cwdPath) {
      window.api.shell.openPath(cwdPath)
    }
  }, [paneId])

  const handleOpenFiles = useCallback(async () => {
    const ptyId = getPtyId(paneId)
    if (!ptyId) return
    const cwdPath = await window.api.pty.getCwd(ptyId)
    if (cwdPath) {
      useTabStore.getState().splitPaneWithType(tabId, paneId, 'vertical', 'file-manager', cwdPath)
    }
  }, [tabId, paneId])

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
