import { create } from 'zustand'
import { nanoid } from 'nanoid'
import {
  LayoutNode,
  createPane,
  splitNode,
  removeNode,
  updateRatios,
  getAllPaneIds,
  setPaneTerminalId
} from '@/lib/layout-tree'

export interface Tab {
  id: string
  title: string
  layoutTree: LayoutNode
  activePaneId: string
}

interface TabStore {
  tabs: Record<string, Tab>
  tabOrder: string[]
  activeTabId: string | null

  createTab: () => string
  closeTab: (id: string) => void
  setActiveTab: (id: string) => void
  setTitle: (tabId: string, title: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void

  // Split pane operations
  splitPane: (tabId: string, paneId: string, direction: 'horizontal' | 'vertical') => void
  closePane: (tabId: string, paneId: string) => void
  setActivePaneId: (tabId: string, paneId: string) => void
  updateLayoutRatios: (tabId: string, branchId: string, ratios: number[]) => void
  setPaneTerminal: (tabId: string, paneId: string, terminalId: string) => void
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

    // Destroy all PTYs in this tab
    const paneIds = getAllPaneIds(tab.layoutTree)
    for (const paneId of paneIds) {
      const node = findPaneNode(tab.layoutTree, paneId)
      if (node?.terminalId) {
        window.api.pty.destroy(node.terminalId)
      }
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

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const newOrder = [...state.tabOrder]
      const [moved] = newOrder.splice(fromIndex, 1)
      newOrder.splice(toIndex, 0, moved)
      return { tabOrder: newOrder }
    }),

  splitPane: (tabId, paneId, direction) =>
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state
      const { tree, newPaneId } = splitNode(tab.layoutTree, paneId, direction)
      return {
        tabs: {
          ...state.tabs,
          [tabId]: { ...tab, layoutTree: tree, activePaneId: newPaneId }
        }
      }
    }),

  closePane: (tabId, paneId) =>
    set((state) => {
      const tab = state.tabs[tabId]
      if (!tab) return state

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
    })
}))

function findPaneNode(
  node: LayoutNode,
  paneId: string
): { terminalId: string | null } | null {
  if (node.type === 'pane' && node.id === paneId) return node
  if (node.type === 'branch') {
    for (const child of node.children) {
      const found = findPaneNode(child, paneId)
      if (found) return found
    }
  }
  return null
}
