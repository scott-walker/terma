import Store from 'electron-store'
import type { SessionState } from '../../shared/types'

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
