import { Terminal, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { Unicode11Addon } from '@xterm/addon-unicode11'
import { useSettingsStore } from '@/stores/settings-store'
import '@xterm/xterm/css/xterm.css'

/** Compute effective xterm lineHeight: base lineHeight + fixed padding (same principle as file manager) */
function effectiveLineHeight(fontSize: number, lineHeight: number): number {
  return lineHeight + 6 / fontSize
}

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
let resizingPaneIds: ReadonlySet<string> = new Set()
const resizeListeners = new Set<() => void>()

/**
 * Mark specific panes as being resized (split-pane drag in progress).
 */
export function setResizingPanes(ids: string[]): void {
  resizingPaneIds = new Set(ids)
  resizeListeners.forEach((fn) => fn())
}

/**
 * Clear all resizing panes and refit terminals (drag ended).
 */
export function clearResizingPanes(): void {
  resizingPaneIds = new Set()
  resizeListeners.forEach((fn) => fn())
  for (const entry of terminals.values()) {
    requestAnimationFrame(() => {
      try {
        entry.fitAddon.fit()
      } catch {
        // ignore
      }
    })
  }
}

export function isPaneResizing(paneId: string): boolean {
  return resizingPaneIds.has(paneId)
}

export function subscribeResizing(fn: () => void): () => void {
  resizeListeners.add(fn)
  return () => { resizeListeners.delete(fn) }
}

// Snapshot of settings relevant to terminal rendering
let prevTerminalSettings: {
  themeColors: ITheme
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorBlink: boolean
  cursorStyle: string
  scrollback: number
} | null = null

function ensureSettingsSubscription(): void {
  if (settingsUnsub) return
  settingsUnsub = useSettingsStore.subscribe(() => {
    const state = useSettingsStore.getState()
    const theme = state.getActiveTheme()
    const effectiveFontSize = state.getEffectiveFontSize()
    const { settings } = state

    const next = {
      themeColors: theme.colors,
      fontFamily: settings.fontFamily,
      fontSize: effectiveFontSize,
      lineHeight: effectiveLineHeight(effectiveFontSize, settings.lineHeight),
      cursorBlink: settings.cursorBlink,
      cursorStyle: settings.cursorStyle,
      scrollback: settings.scrollback
    }

    // Skip if nothing relevant changed
    if (
      prevTerminalSettings &&
      prevTerminalSettings.themeColors === next.themeColors &&
      prevTerminalSettings.fontFamily === next.fontFamily &&
      prevTerminalSettings.fontSize === next.fontSize &&
      prevTerminalSettings.lineHeight === next.lineHeight &&
      prevTerminalSettings.cursorBlink === next.cursorBlink &&
      prevTerminalSettings.cursorStyle === next.cursorStyle &&
      prevTerminalSettings.scrollback === next.scrollback
    ) {
      return
    }
    prevTerminalSettings = next

    for (const entry of terminals.values()) {
      entry.terminal.options.theme = next.themeColors
      entry.terminal.options.fontFamily = next.fontFamily
      entry.terminal.options.fontSize = next.fontSize
      entry.terminal.options.lineHeight = next.lineHeight
      entry.terminal.options.cursorBlink = next.cursorBlink
      entry.terminal.options.cursorStyle = next.cursorStyle
      entry.terminal.options.scrollback = next.scrollback

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
    lineHeight: effectiveLineHeight(effectiveFontSize, state.settings.lineHeight),
    cursorBlink: state.settings.cursorBlink,
    cursorStyle: state.settings.cursorStyle,
    theme: theme.colors,
    allowProposedApi: true,
    scrollback: state.settings.scrollback
  })

  const fitAddon = new FitAddon()
  terminal.loadAddon(fitAddon)
  terminal.loadAddon(new WebLinksAddon((_event, uri) => window.open(uri, '_blank')))

  const unicode11 = new Unicode11Addon()
  terminal.loadAddon(unicode11)
  terminal.unicode.activeVersion = '11'

  // Wrapper div that can be reparented across containers
  const wrapperDiv = document.createElement('div')
  wrapperDiv.style.width = '100%'
  wrapperDiv.style.height = '100%'

  terminal.open(wrapperDiv)

  // Try WebGL, fall back to Canvas, then DOM renderer
  try {
    const webgl = new WebglAddon()
    webgl.onContextLoss(() => {
      try { webgl.dispose() } catch { /* ignore */ }
      try {
        terminal.loadAddon(new CanvasAddon())
      } catch {
        // DOM renderer fallback
      }
    })
    terminal.loadAddon(webgl)
  } catch {
    try {
      terminal.loadAddon(new CanvasAddon())
    } catch {
      // Use default DOM renderer
    }
  }

  // Selection-aware editing: typing/backspace/delete replaces selected text
  terminal.attachCustomKeyEventHandler((event) => {
    // Ctrl+Q — toggle voice recording (prevent xterm from sending XON)
    if (event.code === 'KeyQ' && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
      return false
    }

    // Ctrl+A — select all (layout-independent via event.code)
    if (event.code === 'KeyA' && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey) {
      if (event.type === 'keydown') terminal.selectAll()
      return false
    }

    if (!terminal.hasSelection()) return true
    if (event.type !== 'keydown') return false

    // Determine what to insert after deleting the selection
    let insert = ''
    const isCut =
      event.code === 'KeyX' && event.ctrlKey && !event.altKey && !event.metaKey && !event.shiftKey

    if (isCut || event.key === 'Delete' || event.key === 'Backspace') {
      // Pure deletion — insert nothing
    } else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      // Printable character — replaces selection
      insert = event.key
    } else {
      // Modifier combos, arrows, etc. — let xterm handle normally
      return true
    }

    const selection = terminal.getSelection()
    const selPos = terminal.getSelectionPosition()
    if (!selection || !selPos) return true

    const buf = terminal.buffer.active
    if (buf.type !== 'normal') return true

    const cols = terminal.cols
    const cursorAbsY = buf.baseY + buf.cursorY
    const cursorX = buf.cursorX

    // Find extent of the current logical (wrapped) line
    let logicalStartY = cursorAbsY
    while (logicalStartY > 0 && buf.getLine(logicalStartY)?.isWrapped) logicalStartY--

    let logicalEndY = cursorAbsY
    while (logicalEndY < buf.length - 1 && buf.getLine(logicalEndY + 1)?.isWrapped) logicalEndY++

    // Selection must be within this logical line
    if (selPos.start.y < logicalStartY || selPos.end.y > logicalEndY) return true

    // Every row in the selection range must be part of the same wrapped chain
    for (let y = selPos.start.y + 1; y <= selPos.end.y; y++) {
      if (!buf.getLine(y)?.isWrapped) return true
    }

    // Linear offsets relative to logical line start
    const cursorOff = (cursorAbsY - logicalStartY) * cols + cursorX
    const selEndOff = (selPos.end.y - logicalStartY) * cols + selPos.end.x
    const selStartOff = (selPos.start.y - logicalStartY) * cols + selPos.start.x
    const selLen = selEndOff - selStartOff
    if (selLen <= 0) return true

    if (isCut) {
      navigator.clipboard.writeText(selection)
    }

    // Move cursor to selection end, backspace to delete, then insert replacement
    let seq = ''
    const diff = selEndOff - cursorOff
    if (diff > 0) seq += '\x1b[C'.repeat(diff)
    else if (diff < 0) seq += '\x1b[D'.repeat(-diff)
    seq += '\x7f'.repeat(selLen)
    seq += insert

    terminal.clearSelection()
    window.api.pty.write(ptyId, seq)
    return false
  })

  // PTY data → xterm
  const unsubData = window.api.pty.onData(ptyId, (data) => {
    terminal.write(data)
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
    if (resizingPaneIds.size > 0) return
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
  opts?: { cwd?: string | null; command?: string; args?: string[] }
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

  const createOpts: { cwd?: string; command?: string; args?: string[] } = {}
  if (opts?.cwd) createOpts.cwd = opts.cwd
  if (opts?.command) createOpts.command = opts.command
  if (opts?.args) createOpts.args = opts.args

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
