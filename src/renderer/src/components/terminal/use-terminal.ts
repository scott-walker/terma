import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import '@xterm/xterm/css/xterm.css'

const THEME = {
  background: '#1a1b26',
  foreground: '#c0caf5',
  cursor: '#c0caf5',
  cursorAccent: '#1a1b26',
  selectionBackground: '#33467c',
  selectionForeground: '#c0caf5',
  black: '#15161e',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
  brightBlack: '#414868',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#c0caf5'
}

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  ptyId: string | null,
  active: boolean = true
): void {
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !ptyId) return

    const terminal = new Terminal({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', Menlo, monospace",
      fontSize: 14,
      lineHeight: 1.2,
      cursorBlink: true,
      cursorStyle: 'bar',
      theme: THEME,
      allowProposedApi: true,
      scrollback: 10000
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())

    const unicode11 = new Unicode11Addon()
    terminal.loadAddon(unicode11)
    terminal.unicode.activeVersion = '11'

    terminal.open(container)

    // Try WebGL, fall back to Canvas
    try {
      terminal.loadAddon(new WebglAddon())
    } catch {
      try {
        terminal.loadAddon(new CanvasAddon())
      } catch {
        // Use default DOM renderer
      }
    }

    fitAddon.fit()

    termRef.current = terminal
    fitAddonRef.current = fitAddon

    // PTY data → xterm
    const unsubData = window.api.pty.onData((id, data) => {
      if (id === ptyId) {
        terminal.write(data)
      }
    })

    // xterm input → PTY
    const onDataDisposable = terminal.onData((data) => {
      window.api.pty.write(ptyId, data)
    })

    // Handle resize
    const onResizeDisposable = terminal.onResize(({ cols, rows }) => {
      window.api.pty.resize(ptyId, cols, rows)
    })

    // Sync initial size
    const { cols, rows } = terminal
    window.api.pty.resize(ptyId, cols, rows)

    // ResizeObserver for container
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
        } catch {
          // Ignore fit errors during rapid resize
        }
      })
    })
    resizeObserver.observe(container)

    terminal.focus()

    return () => {
      resizeObserver.disconnect()
      onDataDisposable.dispose()
      onResizeDisposable.dispose()
      unsubData()
      terminal.dispose()
      termRef.current = null
      fitAddonRef.current = null
    }
  }, [containerRef, ptyId])

  // Focus/refit when tab becomes active
  useEffect(() => {
    if (active && termRef.current && fitAddonRef.current) {
      requestAnimationFrame(() => {
        try {
          fitAddonRef.current?.fit()
        } catch {
          // ignore
        }
        termRef.current?.focus()
      })
    }
  }, [active])
}
