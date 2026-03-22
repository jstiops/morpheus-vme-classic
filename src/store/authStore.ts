import { create } from 'zustand'
import { getAccessToken, clearTokens } from '@/api/client'

interface User {
  id: number
  username: string
  displayName?: string
  email?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  logout: () => void
  checkAuth: () => boolean
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: !!getAccessToken(),

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  logout: () => {
    clearTokens()
    set({ user: null, isAuthenticated: false })
  },

  checkAuth: () => {
    const token = getAccessToken()
    if (!token) {
      set({ isAuthenticated: false, user: null })
      return false
    }
    set({ isAuthenticated: true })
    return true
  },
}))
