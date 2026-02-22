import { create } from 'zustand'

interface AgentStore {
  panes: Record<string, string> // paneId → agentProfileId
  selectAgent: (paneId: string, profileId: string) => void
  clearAgent: (paneId: string) => void
}

export const useAgentStore = create<AgentStore>((set) => ({
  panes: {},

  selectAgent: (paneId, profileId) => {
    set((s) => ({
      panes: { ...s.panes, [paneId]: profileId }
    }))
  },

  clearAgent: (paneId) => {
    set((s) => {
      const { [paneId]: _, ...rest } = s.panes
      return { panes: rest }
    })
  }
}))
