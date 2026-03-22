import { create } from 'zustand'

interface UiState {
  globalSearch: string
  setGlobalSearch: (q: string) => void
  isCreateVMOpen: boolean
  openCreateVM: () => void
  closeCreateVM: () => void
  contextMenu: {
    x: number
    y: number
    instanceId: number
    instanceName: string
  } | null
  openContextMenu: (x: number, y: number, instanceId: number, instanceName: string) => void
  closeContextMenu: () => void
}

export const useUiStore = create<UiState>((set) => ({
  globalSearch: '',
  setGlobalSearch: (q) => set({ globalSearch: q }),

  isCreateVMOpen: false,
  openCreateVM: () => set({ isCreateVMOpen: true }),
  closeCreateVM: () => set({ isCreateVMOpen: false }),

  contextMenu: null,
  openContextMenu: (x, y, instanceId, instanceName) =>
    set({ contextMenu: { x, y, instanceId, instanceName } }),
  closeContextMenu: () => set({ contextMenu: null }),
}))
