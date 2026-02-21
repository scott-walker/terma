import { create } from 'zustand'

export interface TerminalSession {
  id: string
  ptyId: string
  title: string
}

interface TerminalStore {
  sessions: Record<string, TerminalSession>
  addSession: (id: string, ptyId: string) => void
  removeSession: (id: string) => void
  setTitle: (id: string, title: string) => void
}

export const useTerminalStore = create<TerminalStore>((set) => ({
  sessions: {},
  addSession: (id, ptyId) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [id]: { id, ptyId, title: 'Terminal' }
      }
    })),
  removeSession: (id) =>
    set((state) => {
      const { [id]: _, ...rest } = state.sessions
      return { sessions: rest }
    }),
  setTitle: (id, title) =>
    set((state) => ({
      sessions: {
        ...state.sessions,
        [id]: { ...state.sessions[id], title }
      }
    }))
}))
