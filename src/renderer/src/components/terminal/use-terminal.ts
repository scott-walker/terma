import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { useSettingsStore } from '@/stores/settings-store'
import '@xterm/xterm/css/xterm.css'

export function useTerminal(
  containerRef: React.RefObject<HTMLDivElement | null>,
  ptyId: string | null,
  active: boolean = true
): void {
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const settings = useSettingsStore((s) => s.settings)

  useEffect(() => {
    const container = containerRef.current
    if (!container || !ptyId) return

    const state = useSettingsStore.getState()
    const theme = state.getActiveTheme()
    const effectiveFontSize = state.getEffectiveFontSize()

    const terminal = new Terminal({
      fontFamily: state.settings.fontFamily,
      fontSize: effectiveFontSize,
      lineHeight: state.settings.lineHeight,
      cursorBlink: state.settings.cursorBlink,
      cursorStyle: state.settings.cursorStyle,
      theme: theme.colors,
      allowProposedApi: true,
      scrollback: state.settings.scrollback
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

  // Reactively apply settings changes to existing terminal
  useEffect(() => {
    const terminal = termRef.current
    const fitAddon = fitAddonRef.current
    if (!terminal || !fitAddon) return

    const state = useSettingsStore.getState()
    const theme = state.getActiveTheme()
    const effectiveFontSize = state.getEffectiveFontSize()

    terminal.options.theme = theme.colors
    terminal.options.fontFamily = settings.fontFamily
    terminal.options.fontSize = effectiveFontSize
    terminal.options.lineHeight = settings.lineHeight
    terminal.options.cursorBlink = settings.cursorBlink
    terminal.options.cursorStyle = settings.cursorStyle
    terminal.options.scrollback = settings.scrollback

    requestAnimationFrame(() => {
      try {
        fitAddon.fit()
      } catch {
        // ignore
      }
    })
  }, [settings])

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
