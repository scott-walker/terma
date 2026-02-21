import { useRef, useEffect, memo } from 'react'
import { attach, detach, focus, getPtyId } from '@/lib/terminal-manager'
import { useTabStore } from '@/stores/tab-store'

interface EditorPaneProps {
  tabId: string
  paneId: string
  active: boolean
  cwd?: string | null
}

export const EditorPane = memo(function EditorPane({ tabId, paneId, active, cwd }: EditorPaneProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const setPaneTerminal = useTabStore((s) => s.setPaneTerminal)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    attach(paneId, container, { cwd, command: 'vim', args: ['.'] }).then((ptyId) => {
      if (ptyId) {
        setPaneTerminal(tabId, paneId, ptyId)
      }
    })

    return () => {
      detach(paneId)
    }
  }, [paneId])

  useEffect(() => {
    if (active) {
      focus(paneId)
    }
  }, [active, paneId])

  // Poll CWD and sync to layout tree
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

  return (
    <div
      ref={containerRef}
      className="h-full w-full px-2 py-1"
    />
  )
})
