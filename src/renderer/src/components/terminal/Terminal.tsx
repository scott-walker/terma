import { useRef, useEffect, useState } from 'react'
import { useTerminal } from './use-terminal'
import { useTabStore } from '@/stores/tab-store'

interface TerminalPaneProps {
  tabId: string
  paneId: string
  active: boolean
}

export function TerminalPane({ tabId, paneId, active }: TerminalPaneProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [ptyId, setPtyId] = useState<string | null>(null)
  const setPaneTerminal = useTabStore((s) => s.setPaneTerminal)

  useEffect(() => {
    let destroyed = false
    let createdPtyId: string | null = null

    window.api.pty.create().then((id) => {
      if (!destroyed) {
        createdPtyId = id
        setPtyId(id)
        setPaneTerminal(tabId, paneId, id)
      } else {
        window.api.pty.destroy(id)
      }
    })

    return () => {
      destroyed = true
      if (createdPtyId) {
        window.api.pty.destroy(createdPtyId)
      }
    }
  }, [tabId, paneId, setPaneTerminal])

  useTerminal(containerRef, ptyId, active)

  return (
    <div
      ref={containerRef}
      className="h-full w-full px-2 py-1"
    />
  )
}
