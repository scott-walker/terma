import { create } from 'zustand'
import { PRESET_THEMES } from '@shared/themes'
import { DEFAULT_SETTINGS, getEffectiveFontSize } from '@shared/settings'
import type { TerminalSettings } from '@shared/settings'
import type { ThemePreset } from '@shared/themes'
import { useToastStore } from './toast-store'

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
    try {
      const settings = await window.api.settings.get()
      set({ settings, loaded: true })
    } catch {
      useToastStore.getState().addToast('error', 'Failed to load settings')
    }
  },

  updateSettings: async (partial) => {
    try {
      const settings = await window.api.settings.update(partial)
      set({ settings })
    } catch {
      useToastStore.getState().addToast('error', 'Failed to update settings')
    }
  },

  resetSettings: async () => {
    try {
      const settings = await window.api.settings.reset()
      set({ settings })
    } catch {
      useToastStore.getState().addToast('error', 'Failed to reset settings')
    }
  },

  zoomIn: async () => {
    const { settings } = get()
    if (settings.zoomLevel < 10) {
      try {
        const s = await window.api.settings.update({ zoomLevel: settings.zoomLevel + 1 })
        set({ settings: s })
      } catch {
        useToastStore.getState().addToast('error', 'Failed to zoom in')
      }
    }
  },

  zoomOut: async () => {
    const { settings } = get()
    if (settings.zoomLevel > -5) {
      try {
        const s = await window.api.settings.update({ zoomLevel: settings.zoomLevel - 1 })
        set({ settings: s })
      } catch {
        useToastStore.getState().addToast('error', 'Failed to zoom out')
      }
    }
  },

  zoomReset: async () => {
    try {
      const s = await window.api.settings.update({ zoomLevel: 0 })
      set({ settings: s })
    } catch {
      useToastStore.getState().addToast('error', 'Failed to reset zoom')
    }
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
