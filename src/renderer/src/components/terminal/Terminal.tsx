import { useRef, useEffect, useState, useCallback, memo } from 'react'
import { attach, detach, focus, getTerminal, getPtyId } from '@/lib/terminal-manager'
import { useTabStore } from '@/stores/tab-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useToastStore } from '@/stores/toast-store'
import { ContextMenu, type MenuEntry } from '@/components/ui/ContextMenu'
import { TranslationSnippet } from '@/components/ui/TranslationSnippet'
import { SpeechSnippet } from '@/components/ui/SpeechSnippet'
import { relativePath, shellEscape } from '@shared/path-utils'

const MIME_FILES = 'application/x-terma-files'

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
  const hasApiKey = useSettingsStore((s) => !!s.settings.openaiApiKey)
  const hasElevenlabsKey = useSettingsStore((s) => !!s.settings.elevenlabsApiKey)
  const [translationSnippet, setTranslationSnippet] = useState<{
    position: { x: number; y: number }
    original: string
    translated: string | null
  } | null>(null)
  const [speechSnippet, setSpeechSnippet] = useState<{
    position: { x: number; y: number }
    text: string
    streamId: string | null
    sampleRate: number
  } | null>(null)

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
    const interval = setInterval(poll, 5000)
    return () => clearInterval(interval)
  }, [tmKey, tabId, updatePaneCwd])

  // Refresh CWD immediately when pane gains focus
  useEffect(() => {
    if (!active) return
    const ptyId = getPtyId(tmKey)
    if (!ptyId) return
    window.api.pty.getCwd(ptyId).then((current) => {
      if (current && current !== lastCwdRef.current) {
        lastCwdRef.current = current
        updatePaneCwd(tabId, paneId, current)
      }
    }).catch(() => {})
  }, [active, tmKey, tabId, paneId, updatePaneCwd])

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

  const handleTranslate = useCallback(async () => {
    const terminal = getTerminal(tmKey)
    const selection = terminal?.getSelection()
    if (!selection) return

    const pos = menuPosition ?? { x: 100, y: 100 }
    setTranslationSnippet({ position: pos, original: selection, translated: null })
    setMenuPosition(null)

    try {
      const result = await window.api.translate.translate(selection)
      setTranslationSnippet((prev) => prev ? { ...prev, translated: result } : null)
    } catch {
      setTranslationSnippet((prev) => prev ? { ...prev, translated: '[Translation error]' } : null)
    }
  }, [tmKey, menuPosition])

  const handleSpeak = useCallback(async () => {
    const terminal = getTerminal(tmKey)
    const selection = terminal?.getSelection()
    if (!selection) return

    const pos = menuPosition ?? { x: 100, y: 100 }
    setSpeechSnippet({ position: pos, text: selection, streamId: null, sampleRate: 16000 })
    setMenuPosition(null)

    try {
      const { streamId, sampleRate } = await window.api.tts.speak(selection)
      setSpeechSnippet((prev) => prev ? { ...prev, streamId, sampleRate } : null)
    } catch (err) {
      useToastStore.getState().addToast('error', err instanceof Error ? err.message : 'TTS failed')
      setSpeechSnippet(null)
    }
  }, [tmKey, menuPosition])

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
    {
      type: 'item',
      label: 'Translate',
      disabled: !hasSelection || !hasApiKey,
      onAction: handleTranslate
    },
    {
      type: 'item',
      label: 'Speak',
      disabled: !hasSelection || !hasElevenlabsKey,
      onAction: handleSpeak
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
      {translationSnippet && (
        <TranslationSnippet
          position={translationSnippet.position}
          original={translationSnippet.original}
          translated={translationSnippet.translated}
          onClose={() => setTranslationSnippet(null)}
        />
      )}
      {speechSnippet && (
        <SpeechSnippet
          position={speechSnippet.position}
          text={speechSnippet.text}
          streamId={speechSnippet.streamId}
          sampleRate={speechSnippet.sampleRate}
          onClose={() => setSpeechSnippet(null)}
        />
      )}
    </>
  )
})
