import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Plus,
  RefreshCw,
} from 'lucide-react'
import { useTreeStore } from '@/store/treeStore'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { useQueryClient } from '@tanstack/react-query'

export function TopBar() {
  const { sidebarCollapsed, toggleSidebar } = useTreeStore()
  const { user, logout } = useAuthStore()
  const { globalSearch, setGlobalSearch, openCreateVM } = useUiStore()
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

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries()
  }

  return (
    <header className="topbar">
      {/* Left: Logo + Sidebar Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-2 mr-1">
          <div
            className="w-6 h-6 rounded flex items-center justify-center font-bold text-xs"
            style={{ background: '#00B388', color: '#000' }}
          >
            H
          </div>
          <span
            className="font-semibold text-xs tracking-wide hidden sm:block"
            style={{ color: '#8B9AB0' }}
          >
            VME Classic
          </span>
        </div>

        <button
          className="btn btn-ghost p-1.5"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Show inventory' : 'Hide inventory'}
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={15} />
          ) : (
            <PanelLeftClose size={15} />
          )}
        </button>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 flex justify-center px-4">
        <div className="relative w-80">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#566278' }}
          />
          <input
            type="text"
            className="input-search w-full"
            placeholder="Search inventory…"
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
          {globalSearch && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
              style={{ color: '#566278' }}
              onClick={() => setGlobalSearch('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions + User */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          className="btn btn-primary py-1.5 px-3 text-xs"
          onClick={openCreateVM}
          title="Create new VM"
        >
          <Plus size={13} />
          <span className="hidden sm:inline">New VM</span>
        </button>

        <button
          className="btn btn-ghost p-1.5"
          onClick={handleRefresh}
          title="Refresh all data"
        >
          <RefreshCw size={14} />
        </button>

        <button className="btn btn-ghost p-1.5 relative" title="Notifications">
          <Bell size={14} />
        </button>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            className="btn btn-ghost flex items-center gap-1.5 px-2 py-1.5"
            onClick={() => setUserMenuOpen((o) => !o)}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
              style={{ background: 'rgba(0,179,136,0.2)', color: '#00B388', border: '1px solid rgba(0,179,136,0.3)' }}
            >
              {(user?.displayName || user?.username || 'U')[0].toUpperCase()}
            </div>
            <span className="hidden md:block text-xs" style={{ color: '#8B9AB0' }}>
              {user?.displayName || user?.username || 'User'}
            </span>
            <ChevronDown size={12} style={{ color: '#566278' }} />
          </button>

          {userMenuOpen && (
            <div
              className="absolute right-0 top-full mt-1 w-48 rounded-lg overflow-hidden z-50"
              style={{
                background: '#141C2E',
                border: '1px solid #2A3450',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
              }}
            >
              <div
                className="px-3 py-2.5 border-b"
                style={{ borderColor: '#1E2A45' }}
              >
                <div className="text-xs font-medium text-white">
                  {user?.displayName || user?.username}
                </div>
                <div className="text-2xs mt-0.5" style={{ color: '#566278' }}>
                  {user?.email || 'Morpheus User'}
                </div>
              </div>
              <div className="py-1">
                <button className="context-menu-item w-full text-left">
                  <User size={13} />
                  Profile
                </button>
                <button className="context-menu-item w-full text-left">
                  <Settings size={13} />
                  Settings
                </button>
                <div className="context-menu-separator" />
                <button
                  className="context-menu-item danger w-full text-left"
                  onClick={handleLogout}
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
