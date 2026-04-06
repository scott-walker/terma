import Store from 'electron-store'
import type { SessionState } from '../../shared/types'

let store: Store<{ session: SessionState | null }> | null = null

function getStore(): Store<{ session: SessionState | null }> {
  if (!store) {
    store = new Store<{ session: SessionState | null }>({
      name: 'terma-session',
      defaults: { session: null }
    })
  }
  return store
}

export const SessionService = {
  save(state: SessionState): void {
    getStore().set('session', state)
  },

  load(): SessionState | null {
    return getStore().get('session')
  }
}
