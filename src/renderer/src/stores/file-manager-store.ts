import { create } from 'zustand'

interface FileManagerStore {
  visible: boolean
  rootPath: string
  expandedDirs: Set<string>

  toggle: () => void
  setVisible: (visible: boolean) => void
  setRootPath: (path: string) => void
  toggleDir: (path: string) => void
  collapseDir: (path: string) => void
}

export const useFileManagerStore = create<FileManagerStore>((set) => ({
  visible: false,
  rootPath: '/',
  expandedDirs: new Set<string>(),

  toggle: () => set((state) => ({ visible: !state.visible })),
  setVisible: (visible) => set({ visible }),
  setRootPath: (path) => set({ rootPath: path, expandedDirs: new Set() }),

  toggleDir: (path) =>
    set((state) => {
      const next = new Set(state.expandedDirs)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return { expandedDirs: next }
    }),

  collapseDir: (path) =>
    set((state) => {
      const next = new Set(state.expandedDirs)
      next.delete(path)
      return { expandedDirs: next }
    })
}))
