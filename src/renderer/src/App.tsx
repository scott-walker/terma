import { useEffect, useCallback } from 'react'
import { TitleBar } from './components/layout/TitleBar'
import { TabBar } from './components/layout/TabBar'
import { SplitPane } from './components/layout/SplitPane'
import { StatusBar } from './components/layout/StatusBar'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { useTabStore } from './stores/tab-store'
import { useSettingsStore } from './stores/settings-store'
import type { ThemePreset } from '@shared/themes'

/* ── Derive UI color tokens from a terminal theme ── */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0'))
      .join('')
  )
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex)
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

function mix(hex1: string, hex2: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(hex1)
  const [r2, g2, b2] = hexToRgb(hex2)
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

function applyThemeToDOM(theme: ThemePreset): void {
  const root = document.documentElement
  const bg = theme.colors.background as string
  const fg = theme.colors.foreground as string
  const green = theme.colors.green as string
  const cyan = theme.colors.cyan as string
  const blue = theme.colors.blue as string
  const red = theme.colors.red as string
  const yellow = theme.colors.yellow as string

  const set = (k: string, v: string): void => root.style.setProperty(k, v)

  // Surfaces — progressively lighter than background
  set('--color-base', bg)
  set('--color-elevated', lighten(bg, 0.04))
  set('--color-surface', lighten(bg, 0.07))
  set('--color-surface-hover', lighten(bg, 0.12))

  // Overlays
  const [fr, fg2, fb] = hexToRgb(fg)
  set('--color-overlay-subtle', `rgba(${fr}, ${fg2}, ${fb}, 0.06)`)
  set('--color-overlay', `rgba(${fr}, ${fg2}, ${fb}, 0.08)`)
  set('--color-backdrop', 'rgba(0, 0, 0, 0.5)')

  // Foreground variants — interpolated between bg and fg
  set('--color-fg', fg)
  set('--color-fg-secondary', mix(bg, fg, 0.6))
  set('--color-fg-muted', mix(bg, fg, 0.38))

  // Borders
  set('--color-border', lighten(bg, 0.08))
  set('--color-border-hover', lighten(bg, 0.16))

  // Semantic accents
  set('--color-accent', green)
  set('--color-danger', red)
  set('--color-info', cyan)
  set('--color-warning', yellow)
  set('--color-directory', blue)
}

export default function App(): JSX.Element {
  const { tabs, tabOrder, activeTabId, createTab, closeTab, splitPane, splitPaneWithType } =
    useTabStore()
  const settingsOpen = useSettingsStore((s) => s.settingsOpen)
  const activeTheme = useSettingsStore((s) => s.getActiveTheme())

  // Apply theme CSS variables whenever the active theme changes
  useEffect(() => {
    applyThemeToDOM(activeTheme)
  }, [activeTheme])

  // Load settings on mount and subscribe to changes from main process
  useEffect(() => {
    useSettingsStore.getState().loadSettings()

    const unsub = window.api.settings.onChanged((settings) => {
      useSettingsStore.setState({ settings })
    })
    return unsub
  }, [])

  // Create initial tab
  useEffect(() => {
    if (tabOrder.length === 0) {
      createTab()
    }
  }, [])

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const { ctrlKey, shiftKey, key } = e
      const state = useTabStore.getState()
      const settingsState = useSettingsStore.getState()

      // Zoom: Ctrl+= / Ctrl+- / Ctrl+0 (no shift)
      if (ctrlKey && !shiftKey) {
        if (key === '=' || key === '+') {
          e.preventDefault()
          settingsState.zoomIn()
          return
        }
        if (key === '-') {
          e.preventDefault()
          settingsState.zoomOut()
          return
        }
        if (key === '0') {
          e.preventDefault()
          settingsState.zoomReset()
          return
        }
      }

      if (ctrlKey && shiftKey) {
        // Settings: Ctrl+Shift+,
        if (key === '<' || key === ',') {
          e.preventDefault()
          settingsState.toggleSettings()
          return
        }

        switch (key) {
          case 'T':
          case 't':
            e.preventDefault()
            createTab()
            break
          case 'W':
          case 'w':
            e.preventDefault()
            if (state.activeTabId) closeTab(state.activeTabId)
            break
          case 'D':
          case 'd':
            e.preventDefault()
            if (state.activeTabId) {
              const tab = state.tabs[state.activeTabId]
              if (tab) splitPane(state.activeTabId, tab.activePaneId, 'vertical')
            }
            break
          case 'E':
          case 'e':
            e.preventDefault()
            if (state.activeTabId) {
              const tab = state.tabs[state.activeTabId]
              if (tab) splitPane(state.activeTabId, tab.activePaneId, 'horizontal')
            }
            break
          case 'B':
          case 'b':
            e.preventDefault()
            if (state.activeTabId) {
              const tab = state.tabs[state.activeTabId]
              if (tab)
                splitPaneWithType(
                  state.activeTabId,
                  tab.activePaneId,
                  'horizontal',
                  'file-manager'
                )
            }
            break
        }

        // Tab switching: Ctrl+Shift+1-9
        if (key >= '1' && key <= '9') {
          e.preventDefault()
          const index = parseInt(key) - 1
          if (index < state.tabOrder.length) {
            useTabStore.getState().setActiveTab(state.tabOrder[index])
          }
        }
      }
    },
    [createTab, closeTab, splitPane, splitPaneWithType]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-base">
      <TitleBar /> 
      <TabBar />
      {/* Content area with padding like nexterm (padding: 6) */}
      <div className="flex-1 overflow-hidden p-2">
        {tabOrder.map((tabId) => {
          const tab = tabs[tabId]
          if (!tab) return null
          const isActive = tabId === activeTabId
          return (
            <div
              key={tabId}
              className={`h-full w-full ${isActive ? 'block' : 'hidden'}`}
            >
              <SplitPane node={tab.layoutTree} tabId={tabId} isTabActive={isActive} />
            </div>
          )
        })}
      </div>
      <StatusBar />
      {settingsOpen && <SettingsPanel />}
    </div>
  )
}
