import { create } from 'zustand'
import { PRESET_THEMES } from '@shared/themes'
import { DEFAULT_SETTINGS, getEffectiveFontSize } from '@shared/settings'
import type { TerminalSettings } from '@shared/settings'
import type { ThemePreset } from '@shared/themes'

interface SettingsState {
  settings: TerminalSettings
  loaded: boolean
  settingsOpen: boolean

  loadSettings: () => Promise<void>
  updateSettings: (partial: Partial<TerminalSettings>) => Promise<void>
  resetSettings: () => Promise<void>
  zoomIn: () => Promise<void>
  zoomOut: () => Promise<void>
  zoomReset: () => Promise<void>
  toggleSettings: () => void

  getActiveTheme: () => ThemePreset
  getEffectiveFontSize: () => number
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  settingsOpen: false,

  loadSettings: async () => {
    const settings = await window.api.settings.get()
    set({ settings, loaded: true })
  },

  updateSettings: async (partial) => {
    const settings = await window.api.settings.update(partial)
    set({ settings })
  },

  resetSettings: async () => {
    const settings = await window.api.settings.reset()
    set({ settings })
  },

  zoomIn: async () => {
    const { settings } = get()
    if (settings.zoomLevel < 10) {
      const s = await window.api.settings.update({ zoomLevel: settings.zoomLevel + 1 })
      set({ settings: s })
    }
  },

  zoomOut: async () => {
    const { settings } = get()
    if (settings.zoomLevel > -5) {
      const s = await window.api.settings.update({ zoomLevel: settings.zoomLevel - 1 })
      set({ settings: s })
    }
  },

  zoomReset: async () => {
    const s = await window.api.settings.update({ zoomLevel: 0 })
    set({ settings: s })
  },

  toggleSettings: () => set((state) => ({ settingsOpen: !state.settingsOpen })),

  getActiveTheme: () => {
    const { settings } = get()
    return (
      PRESET_THEMES.find((t) => t.id === settings.activeThemeId) ?? PRESET_THEMES[0]
    )
  },

  getEffectiveFontSize: () => {
    return getEffectiveFontSize(get().settings)
  }
}))
