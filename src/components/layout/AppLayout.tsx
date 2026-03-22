import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { useTreeStore } from '@/store/treeStore'
import { ContextMenuContainer } from '@/components/common/ContextMenu'
import { VMCreateWizard } from '@/features/vms/VMCreateWizard'
import { useUiStore } from '@/store/uiStore'

export function AppLayout() {
  const { sidebarCollapsed } = useTreeStore()
  const { isCreateVMOpen, closeCreateVM } = useUiStore()

  return (
    <div className="app-layout">
      <TopBar />
      <div className="app-body">
        <Sidebar />
        <main
          className="main-content"
          style={{
            transition: 'margin-left 0.2s ease',
          }}
        >
          <Outlet />
        </main>
      </div>
      <ContextMenuContainer />
      {isCreateVMOpen && <VMCreateWizard onClose={closeCreateVM} />}
    </div>
  )
}
