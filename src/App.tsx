import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import { LoginPage } from '@/features/auth/LoginPage'
import { AppLayout } from '@/components/layout/AppLayout'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { VMListPage } from '@/features/vms/VMListPage'
import { VMDetailPage } from '@/features/vms/VMDetailPage'
import { HostsPage } from '@/features/hosts/HostsPage'
import { ClustersPage } from '@/features/clusters/ClustersPage'
import { NetworksPage } from '@/features/networks/NetworksPage'
import { StoragePage } from '@/features/storage/StoragePage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1A2035',
            color: '#E8ECEF',
            border: '1px solid #2A3450',
            borderRadius: '6px',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#00B388', secondary: '#000' } },
          error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/vms" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="vms" element={<VMListPage />} />
          <Route path="vms/:id" element={<VMDetailPage />} />
          <Route path="hosts" element={<HostsPage />} />
          <Route path="clusters" element={<ClustersPage />} />
          <Route path="networks" element={<NetworksPage />} />
          <Route path="storage" element={<StoragePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
