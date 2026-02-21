import { create } from 'zustand'
import { nanoid } from 'nanoid'

export interface Workspace {
  id: string
  name: string
  cwd: string
}

interface WorkspaceStore {
  workspaces: Record<string, Workspace>
  workspaceOrder: string[]
  activeWorkspaceId: string | null

  createWorkspace: (name: string, cwd?: string) => string
  deleteWorkspace: (id: string) => void
  setActiveWorkspace: (id: string) => void
  renameWorkspace: (id: string, name: string) => void
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: {},
  workspaceOrder: [],
  activeWorkspaceId: null,

  createWorkspace: (name, cwd) => {
    const id = nanoid()
    const workspace: Workspace = {
      id,
      name,
      cwd: cwd || '/'
    }
    set((state) => ({
      workspaces: { ...state.workspaces, [id]: workspace },
      workspaceOrder: [...state.workspaceOrder, id],
      activeWorkspaceId: id
    }))
    return id
  },

  deleteWorkspace: (id) => {
    const state = get()
    const newOrder = state.workspaceOrder.filter((wid) => wid !== id)
    const { [id]: _, ...restWorkspaces } = state.workspaces

    let newActiveId = state.activeWorkspaceId
    if (state.activeWorkspaceId === id) {
      const oldIndex = state.workspaceOrder.indexOf(id)
      newActiveId = newOrder[Math.min(oldIndex, newOrder.length - 1)] || null
    }

    set({
      workspaces: restWorkspaces,
      workspaceOrder: newOrder,
      activeWorkspaceId: newActiveId
    })
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  renameWorkspace: (id, name) =>
    set((state) => ({
      workspaces: {
        ...state.workspaces,
        [id]: { ...state.workspaces[id], name }
      }
    }))
}))
