import Store from 'electron-store'
import { DEFAULT_SETTINGS, type TerminalSettings } from '../../shared/settings'

const store = new Store<TerminalSettings>({
  name: 'terma-settings',
  defaults: DEFAULT_SETTINGS
})

export const SettingsService = {
  getAll(): TerminalSettings {
    return store.store
  },

  update(partial: Partial<TerminalSettings>): TerminalSettings {
    for (const [key, value] of Object.entries(partial)) {
      store.set(key as keyof TerminalSettings, value)
    }
    return store.store
  },

  reset(): TerminalSettings {
    store.clear()
    return store.store
  }
}
