import { create } from 'zustand'

interface PaneFileState {
  rootPath: string
  expandedDirs: Set<string>
}

interface FileManagerStore {
  panes: Record<string, PaneFileState>

  initPane: (paneId: string, rootPath?: string) => void
  removePane: (paneId: string) => void
  toggleDir: (paneId: string, path: string) => void
  collapseDir: (paneId: string, path: string) => void
}

export const useFileManagerStore = create<FileManagerStore>((set) => ({
  panes: {},

  initPane: (paneId, rootPath = window.api.shell.homePath) =>
    set((state) => {
      if (state.panes[paneId]) return state
      return {
        panes: {
          ...state.panes,
          [paneId]: { rootPath, expandedDirs: new Set<string>() }
        }
      }
    }),

  removePane: (paneId) =>
    set((state) => {
      const { [paneId]: _, ...rest } = state.panes
      return { panes: rest }
    }),

  toggleDir: (paneId, path) =>
    set((state) => {
      const pane = state.panes[paneId]
      if (!pane) return state
      const next = new Set(pane.expandedDirs)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return {
        panes: { ...state.panes, [paneId]: { ...pane, expandedDirs: next } }
      }
    }),

  collapseDir: (paneId, path) =>
    set((state) => {
      const pane = state.panes[paneId]
      if (!pane) return state
      const next = new Set(pane.expandedDirs)
      next.delete(path)
      return {
        panes: { ...state.panes, [paneId]: { ...pane, expandedDirs: next } }
      }
    })
}))
