import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, LogOut, RefreshCw } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useQueryClient } from '@tanstack/react-query'

export function TopBar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="topbar">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div
          className="w-5 h-5 rounded flex items-center justify-center font-bold text-xs shrink-0"
          style={{ background: '#00B388', color: '#000' }}
        >
          H
        </div>
        <span className="font-semibold text-xs tracking-wide" style={{ color: '#8B9AB0' }}>
          VME Classic
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1 ml-auto">
        <button
          className="btn btn-ghost p-1.5"
          onClick={() => queryClient.invalidateQueries()}
          title="Refresh all data"
        >
          <RefreshCw size={13} />
        </button>

        <div className="relative" ref={userMenuRef}>
          <button
            className="btn btn-ghost flex items-center gap-1.5 px-2 py-1"
            onClick={() => setUserMenuOpen((o) => !o)}
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: 'rgba(0,179,136,0.2)', color: '#00B388', border: '1px solid rgba(0,179,136,0.3)' }}
            >
              {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
            </div>
            <span className="text-xs hidden md:block" style={{ color: '#8B9AB0' }}>
              {user?.displayName || user?.username || 'User'}
            </span>
            <ChevronDown size={11} style={{ color: '#566278' }} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-44 rounded-lg overflow-hidden z-50"
              style={{ background: '#141C2E', border: '1px solid #2A3450', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
            >
              <div className="px-3 py-2 border-b" style={{ borderColor: '#1E2A45' }}>
                <div className="text-xs font-medium text-white">{user?.displayName || user?.username}</div>
                <div className="text-2xs mt-0.5" style={{ color: '#566278' }}>{user?.email || 'Morpheus User'}</div>
              </div>
              <div className="py-1">
                <button
                  className="context-menu-item danger w-full text-left"
                  onClick={() => { logout(); navigate('/login') }}
                >
                  <LogOut size={13} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
