import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { useSettingsStore } from '@/stores/settings-store'
import '@xterm/xterm/css/xterm.css'

interface TerminalEntry {
  terminal: Terminal
  fitAddon: FitAddon
  ptyId: string
  wrapperDiv: HTMLDivElement
  resizeObserver: ResizeObserver | null
  unsubData: () => void
  onDataDisposable: { dispose(): void }
  onResizeDisposable: { dispose(): void }
}

const terminals = new Map<string, TerminalEntry>()
const pendingAttaches = new Map<string, { cancelled: boolean }>()
let settingsUnsub: (() => void) | null = null

function ensureSettingsSubscription(): void {
  if (settingsUnsub) return
  settingsUnsub = useSettingsStore.subscribe(() => {
    const state = useSettingsStore.getState()
    const theme = state.getActiveTheme()
    const effectiveFontSize = state.getEffectiveFontSize()
    const { settings } = state

    for (const entry of terminals.values()) {
      entry.terminal.options.theme = theme.colors
      entry.terminal.options.fontFamily = settings.fontFamily
      entry.terminal.options.fontSize = effectiveFontSize
      entry.terminal.options.lineHeight = settings.lineHeight
      entry.terminal.options.cursorBlink = settings.cursorBlink
      entry.terminal.options.cursorStyle = settings.cursorStyle
      entry.terminal.options.scrollback = settings.scrollback

      requestAnimationFrame(() => {
        try {
          entry.fitAddon.fit()
        } catch {
          // ignore
        }
      })
    }
  })
}

function createTerminalEntry(paneId: string, ptyId: string): TerminalEntry {
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

  // Wrapper div that can be reparented across containers
  const wrapperDiv = document.createElement('div')
  wrapperDiv.style.width = '100%'
  wrapperDiv.style.height = '100%'

  terminal.open(wrapperDiv)

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

  const entry: TerminalEntry = {
    terminal,
    fitAddon,
    ptyId,
    wrapperDiv,
    resizeObserver: null,
    unsubData,
    onDataDisposable,
    onResizeDisposable
  }

  terminals.set(paneId, entry)
  ensureSettingsSubscription()

  return entry
}

function setupResizeObserver(entry: TerminalEntry, containerEl: HTMLElement): void {
  entry.resizeObserver?.disconnect()
  const observer = new ResizeObserver(() => {
    requestAnimationFrame(() => {
      try {
        entry.fitAddon.fit()
      } catch {
        // ignore
      }
    })
  })
  observer.observe(containerEl)
  entry.resizeObserver = observer
}

/**
 * Attach a terminal to a container element.
 * If a terminal for this paneId already exists, reparents it (DOM move).
 * Otherwise creates a new PTY + xterm instance.
 * Returns the ptyId, or null if the attach was cancelled (component unmounted).
 */
export async function attach(
  paneId: string,
  containerEl: HTMLElement,
  opts?: { cwd?: string | null }
): Promise<string | null> {
  // Reparent existing terminal (synchronous path)
  const existing = terminals.get(paneId)
  if (existing) {
    existing.terminal.clearSelection()
    containerEl.appendChild(existing.wrapperDiv)
    setupResizeObserver(existing, containerEl)

    requestAnimationFrame(() => {
      try {
        existing.fitAddon.fit()
      } catch {
        // ignore
      }
      existing.terminal.focus()
    })

    return existing.ptyId
  }

  // Cancel any in-flight attach for this paneId
  const prev = pendingAttaches.get(paneId)
  if (prev) prev.cancelled = true

  const tracker = { cancelled: false }
  pendingAttaches.set(paneId, tracker)

  const createOpts: { cwd?: string } = {}
  if (opts?.cwd) createOpts.cwd = opts.cwd

  const ptyId = await window.api.pty.create(createOpts)

  pendingAttaches.delete(paneId)

  if (tracker.cancelled) {
    window.api.pty.destroy(ptyId)
    return null
  }

  const entry = createTerminalEntry(paneId, ptyId)
  containerEl.appendChild(entry.wrapperDiv)
  setupResizeObserver(entry, containerEl)

  entry.fitAddon.fit()

  // Sync initial size to PTY
  const { cols, rows } = entry.terminal
  window.api.pty.resize(ptyId, cols, rows)

  entry.terminal.focus()

  return ptyId
}

/**
 * Detach a terminal from its current container (keeps the terminal alive).
 * Safe to call if the terminal was already destroyed — acts as no-op.
 */
export function detach(paneId: string): void {
  const pending = pendingAttaches.get(paneId)
  if (pending) pending.cancelled = true

  const entry = terminals.get(paneId)
  if (!entry) return

  entry.resizeObserver?.disconnect()
  entry.resizeObserver = null

  if (entry.wrapperDiv.parentElement) {
    entry.wrapperDiv.remove()
  }
}

/**
 * Fully destroy a terminal: dispose xterm, kill PTY, clean up listeners.
 */
export function destroy(paneId: string): void {
  const pending = pendingAttaches.get(paneId)
  if (pending) pending.cancelled = true

  const entry = terminals.get(paneId)
  if (!entry) return

  entry.resizeObserver?.disconnect()
  entry.unsubData()
  entry.onDataDisposable.dispose()
  entry.onResizeDisposable.dispose()

  try {
    entry.terminal.dispose()
  } catch {
    // WebGL addon may throw during dispose
  }

  window.api.pty.destroy(entry.ptyId)
  terminals.delete(paneId)
}

/**
 * Focus and refit a terminal (e.g. when its tab becomes active).
 */
export function focus(paneId: string): void {
  const entry = terminals.get(paneId)
  if (!entry) return

  requestAnimationFrame(() => {
    try {
      entry.fitAddon.fit()
    } catch {
      // ignore
    }
    entry.terminal.focus()
  })
}

/**
 * Get the PTY id for a pane (used by session snapshot to query cwd).
 */
export function getPtyId(paneId: string): string | null {
  return terminals.get(paneId)?.ptyId ?? null
}

/**
 * Get the xterm Terminal instance for a pane (used for reading selection, etc.).
 */
export function getTerminal(paneId: string): Terminal | null {
  return terminals.get(paneId)?.terminal ?? null
}
