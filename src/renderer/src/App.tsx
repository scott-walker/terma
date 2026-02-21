import { useEffect, useCallback } from 'react'
import { TitleBar } from './components/layout/TitleBar'
import { TabBar } from './components/layout/TabBar'
import { SplitPane } from './components/layout/SplitPane'
import { FileManager } from './components/file-manager/FileManager'
import { SettingsPanel } from './components/settings/SettingsPanel'
import { useTabStore } from './stores/tab-store'
import { useFileManagerStore } from './stores/file-manager-store'
import { useSettingsStore } from './stores/settings-store'

export default function App(): JSX.Element {
  const { tabs, tabOrder, activeTabId, createTab, closeTab, splitPane } = useTabStore()
  const toggleFileManager = useFileManagerStore((s) => s.toggle)
  const settingsOpen = useSettingsStore((s) => s.settingsOpen)
  const activeTheme = useSettingsStore((s) => s.getActiveTheme())

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
            toggleFileManager()
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
    [createTab, closeTab, splitPane, toggleFileManager]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      className="flex h-screen w-screen flex-col overflow-hidden"
      style={{ backgroundColor: activeTheme.colors.background as string }}
    >
      <TitleBar />
      <TabBar />
      <div className="flex flex-1 overflow-hidden">
        <FileManager />
        <div className="flex-1 overflow-hidden">
          {tabOrder.map((tabId) => {
            const tab = tabs[tabId]
            if (!tab) return null
            const isActive = tabId === activeTabId
            return (
              <div
                key={tabId}
                className="h-full w-full"
                style={{ display: isActive ? 'block' : 'none' }}
              >
                <SplitPane node={tab.layoutTree} tabId={tabId} isTabActive={isActive} />
              </div>
            )
          })}
        </div>
      </div>
      {settingsOpen && <SettingsPanel />}
    </div>
  )
}
