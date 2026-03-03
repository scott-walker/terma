import { create } from 'zustand'
import type { ShareSessionInfo } from '@shared/share-types'

interface ShareStore {
  // paneId → ShareSessionInfo
  sessions: Record<string, ShareSessionInfo>
  startShare(ptyId: string, paneId: string): Promise<ShareSessionInfo>
  stopShare(paneId: string): Promise<void>
  getSession(paneId: string): ShareSessionInfo | null
  refreshStatus(paneId: string): Promise<void>
}

export const useShareStore = create<ShareStore>((set, get) => ({
  sessions: {},

  async startShare(ptyId: string, paneId: string): Promise<ShareSessionInfo> {
    const info = await window.api.share.start(ptyId)
    set((s) => ({ sessions: { ...s.sessions, [paneId]: info } }))
    return info
  },

  async stopShare(paneId: string): Promise<void> {
    const info = get().sessions[paneId]
    if (!info) return
    await window.api.share.stop(info.sessionId)
    set((s) => {
      const sessions = { ...s.sessions }
      delete sessions[paneId]
      return { sessions }
    })
  },

  getSession(paneId: string): ShareSessionInfo | null {
    return get().sessions[paneId] ?? null
  },

  async refreshStatus(paneId: string): Promise<void> {
    const info = get().sessions[paneId]
    if (!info) return
    const updated = await window.api.share.status(info.sessionId)
    if (!updated) {
      set((s) => {
        const sessions = { ...s.sessions }
        delete sessions[paneId]
        return { sessions }
      })
    } else {
      set((s) => ({ sessions: { ...s.sessions, [paneId]: updated } }))
    }
  }
}))
