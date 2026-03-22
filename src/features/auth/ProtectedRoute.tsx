import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore()
  if (!checkAuth()) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
