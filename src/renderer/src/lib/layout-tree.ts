import { nanoid } from 'nanoid'
import type { PaneType, PaneNode, BranchNode, LayoutNode } from '@shared/types'

export type { PaneType, PaneNode, BranchNode, LayoutNode }

export function createPane(
  paneType: PaneType = 'terminal',
  terminalId: string | null = null,
  cwd: string | null = null
): PaneNode {
  return { type: 'pane', id: nanoid(), paneType, terminalId, cwd }
}

export function findNode(root: LayoutNode, nodeId: string): LayoutNode | null {
  if (root.id === nodeId) return root
  if (root.type === 'branch') {
    for (const child of root.children) {
      const found = findNode(child, nodeId)
      if (found) return found
    }
  }
  return null
}

export function findParent(
  root: LayoutNode,
  nodeId: string
): { parent: BranchNode; index: number } | null {
  if (root.type !== 'branch') return null
  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === nodeId) {
      return { parent: root, index: i }
    }
    const found = findParent(root.children[i], nodeId)
    if (found) return found
  }
  return null
}

export function splitNode(
  root: LayoutNode,
  targetId: string,
  direction: 'horizontal' | 'vertical',
  paneType: PaneType = 'terminal',
  cwd: string | null = null
): { tree: LayoutNode; newPaneId: string } {
  const newPane = createPane(paneType, null, cwd)

  function walk(node: LayoutNode): LayoutNode {
    if (node.id === targetId && node.type === 'pane') {
      return {
        type: 'branch',
        id: nanoid(),
        direction,
        children: [node, newPane],
        ratios: [50, 50]
      }
    }
    if (node.type === 'branch') {
      return {
        ...node,
        children: node.children.map(walk)
      }
    }
    return node
  }

  return { tree: walk(root), newPaneId: newPane.id }
}

export function removeNode(root: LayoutNode, targetId: string): LayoutNode | null {
  if (root.type === 'pane') {
    return root.id === targetId ? null : root
  }

  const newChildren: LayoutNode[] = []
  const newRatios: number[] = []
  let removedRatio = 0

  for (let i = 0; i < root.children.length; i++) {
    if (root.children[i].id === targetId) {
      removedRatio = root.ratios[i]
      continue
    }
    const child = removeNode(root.children[i], targetId)
    if (child) {
      newChildren.push(child)
      newRatios.push(root.ratios[i])
    } else {
      removedRatio = root.ratios[i]
    }
  }

  if (newChildren.length === 0) return null
  if (newChildren.length === 1) return newChildren[0]

  // Redistribute removed ratio
  const total = newRatios.reduce((a, b) => a + b, 0)
  const adjustedRatios = newRatios.map((r) => (r / total) * (total + removedRatio))

  return { ...root, children: newChildren, ratios: adjustedRatios }
}

export function updateRatios(
  root: LayoutNode,
  branchId: string,
  ratios: number[]
): LayoutNode {
  if (root.id === branchId && root.type === 'branch') {
    return { ...root, ratios }
  }
  if (root.type === 'branch') {
    return {
      ...root,
      children: root.children.map((child) => updateRatios(child, branchId, ratios))
    }
  }
  return root
}

export function getAllPaneIds(root: LayoutNode): string[] {
  if (root.type === 'pane') return [root.id]
  return root.children.flatMap(getAllPaneIds)
}

export function getPaneTerminalId(root: LayoutNode, paneId: string): string | null {
  const node = findNode(root, paneId)
  if (node?.type === 'pane') return node.terminalId
  return null
}

export function setPaneTerminalId(
  root: LayoutNode,
  paneId: string,
  terminalId: string
): LayoutNode {
  if (root.type === 'pane' && root.id === paneId) {
    return { ...root, terminalId }
  }
  if (root.type === 'branch') {
    return {
      ...root,
      children: root.children.map((child) => setPaneTerminalId(child, paneId, terminalId))
    }
  }
  return root
}

export function setPaneCwd(
  root: LayoutNode,
  paneId: string,
  cwd: string | null
): LayoutNode {
  if (root.type === 'pane' && root.id === paneId) {
    return { ...root, cwd }
  }
  if (root.type === 'branch') {
    return {
      ...root,
      children: root.children.map((child) => setPaneCwd(child, paneId, cwd))
    }
  }
  return root
}

export function swapPanes(root: LayoutNode, paneId1: string, paneId2: string): LayoutNode {
  if (paneId1 === paneId2) return root
  const node1 = findNode(root, paneId1)
  const node2 = findNode(root, paneId2)
  if (!node1 || !node2 || node1.type !== 'pane' || node2.type !== 'pane') return root

  function walk(node: LayoutNode): LayoutNode {
    if (node.type === 'pane') {
      if (node.id === paneId1) return node2 as PaneNode
      if (node.id === paneId2) return node1 as PaneNode
      return node
    }
    const newChildren = node.children.map(walk)
    if (newChildren.every((c, i) => c === node.children[i])) return node
    return { ...node, children: newChildren }
  }
  return walk(root)
}

const PREVIEW_RATIO = 30

export function appendRight(
  root: LayoutNode,
  paneType: PaneType = 'terminal',
  cwd: string | null = null
): { tree: LayoutNode; newPaneId: string } {
  const newPane = createPane(paneType, null, cwd)
  const scale = (100 - PREVIEW_RATIO) / 100

  if (root.type === 'pane') {
    return {
      tree: {
        type: 'branch',
        id: nanoid(),
        direction: 'vertical',
        children: [root, newPane],
        ratios: [100 - PREVIEW_RATIO, PREVIEW_RATIO]
      },
      newPaneId: newPane.id
    }
  }

  // Already side-by-side → append as last child
  if (root.direction === 'vertical') {
    return {
      tree: {
        ...root,
        children: [...root.children, newPane],
        ratios: [...root.ratios.map((r) => r * scale), PREVIEW_RATIO]
      },
      newPaneId: newPane.id
    }
  }

  // Stacked → wrap in a vertical branch
  return {
    tree: {
      type: 'branch',
      id: nanoid(),
      direction: 'vertical',
      children: [root, newPane],
      ratios: [100 - PREVIEW_RATIO, PREVIEW_RATIO]
    },
    newPaneId: newPane.id
  }
}

export function setPaneType(
  root: LayoutNode,
  paneId: string,
  paneType: PaneType
): LayoutNode {
  if (root.type === 'pane' && root.id === paneId) {
    return { ...root, paneType }
  }
  if (root.type === 'branch') {
    return {
      ...root,
      children: root.children.map((child) => setPaneType(child, paneId, paneType))
    }
  }
  return root
}
