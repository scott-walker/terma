import { create } from 'zustand'
import { nanoid } from 'nanoid'
import {
  LayoutNode,
  PaneNode,
  PaneType,
  createPane,
  splitNode,
  appendRight,
  removeNode,
  updateRatios,
  getAllPaneIds,
  setPaneTerminalId,
  setPaneType as setPaneTypeInTree,
  setPaneCwd,
  swapPanes as swapPanesInTree,
  findNode
} from '@/lib/layout-tree'
import type { SessionState } from '@shared/types'
import { useFileManagerStore } from './file-manager-store'
import { useSshStore } from './ssh-store'
import { useAgentStore } from './agent-store'
import * as terminalManager from '@/lib/terminal-manager'

export type Tab = SessionState['tabs'][string]

function collectPaneNodes(node: LayoutNode): PaneNode[] {
  if (node.type === 'pane') return [node]
  return node.children.flatMap(collectPaneNodes)
}

async function resolvePaneCwd(paneId: string, layoutTree: LayoutNode): Promise<string | null> {
  const node = findNode(layoutTree, paneId)
  if (!node || node.type !== 'pane') return null
  if (node.paneType === 'terminal' || node.paneType === 'agent') {
    const key = node.paneType === 'agent' ? paneId + ':agent' : paneId
    const ptyId = terminalManager.getPtyId(key)
    if (ptyId) return await window.api.pty.getCwd(ptyId)
  } else if (node.paneType === 'file-manager') {
    const fmPane = useFileManagerStore.getState().panes[paneId]
    if (fmPane) return fmPane.rootPath
  } else if (node.paneType === 'markdown' || node.paneType === 'image') {
    return node.cwd
  }
  return null
}

function stripTerminalIds(node: LayoutNode): LayoutNode {
  if (node.type === 'pane') {
    return { ...node, terminalId: null }
  }
  return { ...node, children: node.children.map(stripTerminalIds) }
}

interface TabStore {
  tabs: Record<string, Tab>
  tabOrder: string[]
  activeTabId: string | null

  createTab: () => string
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  setTitle: (tabId: string, title: string) => void
  setTabColor: (tabId: string, color: string | null) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void

  // Split pane operations
  splitPane: (tabId: string, paneId: string, direction: 'horizontal' | 'vertical') => Promise<string | null>
  splitPaneWithType: (
    tabId: string,
    paneId: string,
    direction: 'horizontal' | 'vertical',
    paneType: PaneType,
    cwd?: string | null
  ) => Promise<string | null>
  closePane: (tabId: string, paneId: string) => void
  setActivePaneId: (tabId: string, paneId: string) => void
  updateLayoutRatios: (tabId: string, branchId: string, ratios: number[]) => void
  setPaneTerminal: (tabId: string, paneId: string, terminalId: string) => void
  setPaneType: (tabId: string, paneId: string, paneType: PaneType) => void
  updatePaneCwd: (tabId: string, paneId: string, cwd: string) => void
  swapPanes: (tabId: string, paneId1: string, paneId2: string) => void
  openRightPane: (tabId: string, paneType: PaneType, cwd: string) => void

  getSessionState: () => Promise<SessionState>
  restoreSession: (snapshot: SessionState) => void
}

export const useTabStore = create<TabStore>((set, get) => ({
  tabs: {},
  tabOrder: [],
  activeTabId: null,

  createTab: () => {
    const id = nanoid()
    const pane = createPane()
    const tab: Tab = {
      id,
      title: 'Terminal',
      layoutTree: pane,
      activePaneId: pane.id
    }
    set((state) => ({
      tabs: { ...state.tabs, [id]: tab },
      tabOrder: [...state.tabOrder, id],
      activeTabId: id
    }))
    return id
  },

  closeTab: (id) => {
    const state = get()
    const tab = state.tabs[id]
    if (!tab) return

    // Destroy all terminals and clean up stores for this tab
    const paneIds = getAllPaneIds(tab.layoutTree)
    for (const paneId of paneIds) {
      terminalManager.destroy(paneId)
      terminalManager.destroy(paneId + ':ssh')
      terminalManager.destroy(paneId + ':agent')
      useFileManagerStore.getState().removePane(paneId)
      useSshStore.getState().removePaneSsh(paneId)
      useSshStore.getState().removeEditor(paneId)
      useAgentStore.getState().clearAgent(paneId)
    }

    const newOrder = state.tabOrder.filter((tid) => tid !== id)
    const { [id]: _, ...restTabs } = state.tabs

    let newActiveId = state.activeTabId
    if (state.activeTabId === id) {
      const oldIndex = state.tabOrder.indexOf(id)
      newActiveId = newOrder[Math.min(oldIndex, newOrder.length - 1)] || null
    }

    set({
      tabs: restTabs,
      tabOrder: newOrder,
      activeTabId: newActiveId
    })
  },

  setActiveTab: (id) => set({ activeTabId: id }),

  setTitle: (tabId, title) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tabId]: { ...state.tabs[tabId], title }
      }
    })),

  setTabColor: (tabId, color) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tabId]: { ...state.tabs[tabId], color }
      }
    })),

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const newOrder = [...state.tabOrder]
      const [moved] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, moved)
      return { tabOrder: newOrder }
    }),

  splitPane: async (tabId, paneId, direction) => {
    const tab = get().tabs[tabId]
    const cwd = tab ? await resolvePaneCwd(paneId, tab.layoutTree) : null
    let resultPaneId: string | null = null
    set((state) => {
      const currentTab = state.tabs[tabId]
      if (!currentTab) return state
      const { tree, newPaneId } = splitNode(currentTab.layoutTree, paneId, direction, 'terminal', cwd)
      resultPaneId = newPaneId
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...currentTab, layoutTree: tree, activePaneId: newPaneId }
        }
      }
    })
    return resultPaneId
  },

  splitPaneWithType: async (tabId, paneId, direction, paneType, cwd) => {
    if (cwd === undefined || cwd === null) {
      const tab = get().tabs[tabId]
      cwd = tab ? await resolvePaneCwd(paneId, tab.layoutTree) : null
    }
    let resultPaneId: string | null = null
    set((state) => {
      const currentTab = state.tabs[tabId]
      if (!currentTab) return state
      const { tree, newPaneId } = splitNode(currentTab.layoutTree, paneId, direction, paneType, cwd ?? null)
      resultPaneId = newPaneId
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...currentTab, layoutTree: tree, activePaneId: newPaneId }
        }
      }
    })
    return resultPaneId
  },

  closePane: (tabId, paneId) =>
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state

      terminalManager.destroy(paneId)
      terminalManager.destroy(paneId + ':ssh')
      terminalManager.destroy(paneId + ':agent')
      useFileManagerStore.getState().removePane(paneId)
      useSshStore.getState().removePaneSsh(paneId)
      useSshStore.getState().removeEditor(paneId)
      useAgentStore.getState().clearAgent(paneId)

      const newTree = removeNode(tab.layoutTree, paneId)
      if (!newTree) {
        // Last pane closed — close the tab
        const store = get()
        setTimeout(() => store.closeTab(tabId), 0)
        return state
      }

      const allPanes = getAllPaneIds(newTree)
      const newActivePaneId = allPanes.includes(tab.activePaneId)
        ? tab.activePaneId
        : allPanes[0]

      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, layoutTree: newTree, activePaneId: newActivePaneId }
        }
      }
    }),

  setActivePaneId: (tabId, paneId) =>
    set((state) => ({
      tabs: {
        ...state.tabs,
        [tabId]: { ...state.tabs[tabId], activePaneId: paneId }
      }
    })),

  updateLayoutRatios: (tabId, branchId, ratios) =>
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, layoutTree: updateRatios(tab.layoutTree, branchId, ratios) }
        }
      }
    }),

  setPaneTerminal: (tabId, paneId, terminalId) =>
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, layoutTree: setPaneTerminalId(tab.layoutTree, paneId, terminalId) }
        }
      }
    }),

  setPaneType: (tabId, paneId, paneType) => {
    // Detach (not destroy) both terminals so switching back preserves the session
    terminalManager.detach(paneId)
    terminalManager.detach(paneId + ':agent')
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, layoutTree: setPaneTypeInTree(tab.layoutTree, paneId, paneType) }
        }
      }
    })
  },

  updatePaneCwd: (tabId, paneId, cwd) =>
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, layoutTree: setPaneCwd(tab.layoutTree, paneId, cwd) }
        }
      }
    }),

  swapPanes: (tabId, paneId1, paneId2) =>
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, layoutTree: swapPanesInTree(tab.layoutTree, paneId1, paneId2) }
        }
      }
    }),

  openRightPane: (tabId, paneType, cwd) =>
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state
      const { tree } = appendRight(tab.layoutTree, paneType, cwd)
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, layoutTree: tree }
        }
      }
    }),

  getSessionState: async () => {
    const state = get()
    const snapshotTabs: Record<string, Tab> = {}

    for (const [tabId, tab] of Object.entries(state.tabs)) {
      const panes = collectPaneNodes(tab.layoutTree)
      let tree = tab.layoutTree

      // Resolve cwd for each pane that has a live PTY (including hidden terminals)
      for (const pane of panes) {
        const key = pane.paneType === 'agent' ? pane.id + ':agent' : pane.id
        const ptyId = terminalManager.getPtyId(key)
        if (ptyId) {
          const cwd = await window.api.pty.getCwd(ptyId)
          if (cwd) {
            tree = setPaneCwd(tree, pane.id, cwd)
          }
        }
      }

      // Strip terminalIds — PTYs won't survive restart
      tree = stripTerminalIds(tree)

      snapshotTabs[tabId] = { ...tab, layoutTree: tree }
    }

    // Collect file manager state
    const fmStore = useFileManagerStore.getState()
    const fileManagerPanes: Record<string, { rootPath: string; expandedDirs: string[] }> = {}
    for (const [paneId, pane] of Object.entries(fmStore.panes)) {
      fileManagerPanes[paneId] = {
        rootPath: pane.rootPath,
        expandedDirs: Array.from(pane.expandedDirs)
      }
    }

    return {
      tabs: snapshotTabs,
      tabOrder: state.tabOrder,
      activeTabId: state.activeTabId,
      fileManagerPanes
    }
  },

  restoreSession: (snapshot) => {
    set({
      tabs: snapshot.tabs,
      tabOrder: snapshot.tabOrder,
      activeTabId: snapshot.activeTabId
    })

    // Restore file manager panes
    if (snapshot.fileManagerPanes) {
      const fmStore = useFileManagerStore.getState()
      for (const [paneId, fmState] of Object.entries(snapshot.fileManagerPanes)) {
        fmStore.initPane(paneId, fmState.rootPath)
        // Restore expanded dirs
        const pane = useFileManagerStore.getState().panes[paneId]
        if (pane) {
          for (const dir of fmState.expandedDirs) {
            fmStore.toggleDir(paneId, dir)
          }
        }
      }
    }
  }
}))

