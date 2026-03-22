import { create } from 'zustand'

export type TreeNodeType =
  | 'root'
  | 'datacenter'
  | 'cluster'
  | 'host'
  | 'vm'
  | 'networks'
  | 'storage'
  | 'templates'

export interface TreeNode {
  id: string
  label: string
  type: TreeNodeType
  entityId?: number
  children?: TreeNode[]
  status?: string
}

interface TreeState {
  expanded: Set<string>
  selected: string | null
  sidebarCollapsed: boolean
  toggleExpand: (id: string) => void
  setSelected: (id: string | null) => void
  toggleSidebar: () => void
  expandAll: () => void
  collapseAll: () => void
}

export const useTreeStore = create<TreeState>((set) => ({
  expanded: new Set(['root', 'datacenters', 'networks', 'storage']),
  selected: null,
  sidebarCollapsed: false,

  toggleExpand: (id) =>
    set((state) => {
      const next = new Set(state.expanded)
      next.has(id) ? next.delete(id) : next.add(id)
      return { expanded: next }
    }),

  setSelected: (id) => set({ selected: id }),

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  expandAll: () =>
    set((state) => {
      // Expand current known ids
      return { expanded: new Set([...state.expanded]) }
    }),

  collapseAll: () =>
    set({ expanded: new Set(['root']) }),
}))
