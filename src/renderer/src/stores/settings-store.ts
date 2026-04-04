import { create } from 'zustand'
import { PRESET_THEMES } from '@shared/themes'
import { DEFAULT_SETTINGS } from '@shared/settings'
import type { TerminalSettings } from '@shared/settings'
import type { ThemePreset } from '@shared/themes'
import { useToastStore } from './toast-store'

function applyZoomFactor(zoomLevel: number): void {
  window.api.zoom.setFactor(zoomLevel / 100)
}

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
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  settingsOpen: false,

  loadSettings: async () => {
    try {
      const settings = await window.api.settings.get()
      // Migrate old zoomLevel (was an integer offset, e.g. 0, 1, -2) to percentage
      if (settings.zoomLevel < 50) {
        settings.zoomLevel = 100
      }
      applyZoomFactor(settings.zoomLevel)
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
    const next = Math.min(500, settings.zoomLevel + (settings.zoomStep || 10))
    try {
      applyZoomFactor(next)
      const s = await window.api.settings.update({ zoomLevel: next })
      set({ settings: s })
    } catch {
      useToastStore.getState().addToast('error', 'Failed to zoom in')
    }
  },

  zoomOut: async () => {
    const { settings } = get()
    const next = Math.max(25, settings.zoomLevel - (settings.zoomStep || 10))
    try {
      applyZoomFactor(next)
      const s = await window.api.settings.update({ zoomLevel: next })
      set({ settings: s })
    } catch {
      useToastStore.getState().addToast('error', 'Failed to zoom out')
    }
  },

  zoomReset: async () => {
    try {
      applyZoomFactor(100)
      const s = await window.api.settings.update({ zoomLevel: 100 })
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
  }
}))
