import { create } from 'zustand'

type SshConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

interface SshPaneState {
  profileId: string
  state: SshConnectionState
  error?: string
}

interface SshEditorMeta {
  profileName: string
  filePath: string
}

interface SshStore {
  panes: Record<string, SshPaneState>
  editorPanes: Record<string, SshEditorMeta>
  enterSshMode(paneId: string): void
  exitSshMode(paneId: string): void
  connect(paneId: string, profileId: string): Promise<void>
  disconnect(paneId: string): Promise<void>
  removePaneSsh(paneId: string): void
  getPaneState(paneId: string): SshPaneState | undefined
  registerEditor(paneId: string, meta: SshEditorMeta): void
  removeEditor(paneId: string): void
}

export const useSshStore = create<SshStore>((set, get) => ({
  panes: {},
  editorPanes: {},

  enterSshMode: (paneId) => {
    const existing = get().panes[paneId]
    if (existing) return
    set((s) => ({
      panes: { ...s.panes, [paneId]: { profileId: '', state: 'idle' } }
    }))
  },

  exitSshMode: (paneId) => {
    const pane = get().panes[paneId]
    if (!pane) return
    if (pane.state === 'connected' && pane.profileId) {
      window.api.ssh.disconnect(pane.profileId).catch(() => {})
    }
    set((s) => {
      const { [paneId]: _, ...rest } = s.panes
      return { panes: rest }
    })
  },

  connect: async (paneId, profileId) => {
    set((s) => ({
      panes: { ...s.panes, [paneId]: { profileId, state: 'connecting' } }
    }))
    try {
      await window.api.ssh.connect(profileId)
      set((s) => ({
        panes: { ...s.panes, [paneId]: { profileId, state: 'connected' } }
      }))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connection failed'
      set((s) => ({
        panes: { ...s.panes, [paneId]: { profileId, state: 'error', error: message } }
      }))
      throw err
    }
  },

  disconnect: async (paneId) => {
    const pane = get().panes[paneId]
    if (!pane) return
    try {
      await window.api.ssh.disconnect(pane.profileId)
    } catch {
      // ignore disconnect errors
    }
    set((s) => {
      const { [paneId]: _, ...rest } = s.panes
      return { panes: rest }
    })
  },

  removePaneSsh: (paneId) => {
    const pane = get().panes[paneId]
    if (!pane) return
    // Fire and forget disconnect
    if (pane.profileId) {
      window.api.ssh.disconnect(pane.profileId).catch(() => {})
    }
    set((s) => {
      const { [paneId]: _, ...rest } = s.panes
      return { panes: rest }
    })
  },

  getPaneState: (paneId) => {
    return get().panes[paneId]
  },

  registerEditor: (paneId, meta) => {
    set((s) => ({
      editorPanes: { ...s.editorPanes, [paneId]: meta }
    }))
  },

  removeEditor: (paneId) => {
    set((s) => {
      const { [paneId]: _, ...rest } = s.editorPanes
      return { editorPanes: rest }
    })
  }
}))
