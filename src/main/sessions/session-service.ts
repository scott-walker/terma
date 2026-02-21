import Store from 'electron-store'

export interface SessionState {
  tabs: Record<string, unknown>
  tabOrder: string[]
  activeTabId: string | null
  fileManagerPanes: Record<string, { rootPath: string; expandedDirs: string[] }>
}

const store = new Store<{ session: SessionState | null }>({
  name: 'terma-session',
  defaults: { session: null }
})

export const SessionService = {
  save(state: SessionState): void {
    store.set('session', state)
  },

  load(): SessionState | null {
    return store.get('session')
  }
}
