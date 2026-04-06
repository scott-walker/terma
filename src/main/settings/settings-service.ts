import Store from 'electron-store'
import { DEFAULT_SETTINGS, type TerminalSettings } from '../../shared/settings'

let store: Store<TerminalSettings> | null = null

function getStore(): Store<TerminalSettings> {
  if (!store) {
    store = new Store<TerminalSettings>({
      name: 'terma-settings',
      defaults: DEFAULT_SETTINGS
    })
  }
  return store
}

export const SettingsService = {
  getAll(): TerminalSettings {
    return getStore().store
  },

  update(partial: Partial<TerminalSettings>): TerminalSettings {
    const s = getStore()
    s.set(partial)
    return s.store
  },

  reset(): TerminalSettings {
    const s = getStore()
    s.clear()
    return s.store
  }
}
