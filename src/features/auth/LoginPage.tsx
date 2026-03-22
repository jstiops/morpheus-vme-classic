import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { login, fetchCurrentUser } from '@/api/auth'
import { LoadingSpinner } from '@/components/common/LoadingSpinner'
import toast from 'react-hot-toast'

export function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, setUser } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Username and password are required.')
      return
    }
    setError('')
    setLoading(true)
    try {
      await login(username, password, remember)
      const user = await fetchCurrentUser()
      setUser(user)
      toast.success(`Welcome, ${user.displayName || user.username}`)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error_description?: string } } })
          ?.response?.data?.error_description ||
        'Invalid username or password.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0E1A' }}>
      {/* Top stripe */}
      <div
        className="h-1 w-full"
        style={{ background: 'linear-gradient(90deg, #00B388 0%, #17EBA0 100%)' }}
      />

      {/* Header */}
      <div
        className="flex items-center px-8 py-3"
        style={{ borderBottom: '1px solid #1A2240' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded flex items-center justify-center font-bold text-sm"
            style={{ background: '#00B388', color: '#000' }}
          >
            H
          </div>
          <span className="font-semibold text-white tracking-wide text-sm">
            HPE Morpheus VME Classic
          </span>
        </div>
      </div>

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div
          className="w-full max-w-sm rounded-lg p-8"
          style={{
            background: '#141C2E',
            border: '1px solid #1E2A45',
            boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
          }}
        >
          {/* Wordmark */}
          <div className="mb-8 text-center">
            <div
              className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
              style={{ background: 'rgba(0,179,136,0.15)', border: '1px solid rgba(0,179,136,0.3)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="8" height="8" rx="1.5" fill="#00B388" />
                <rect x="14" y="3" width="8" height="8" rx="1.5" fill="#00B388" opacity="0.7" />
                <rect x="2" y="13" width="8" height="8" rx="1.5" fill="#00B388" opacity="0.7" />
                <rect x="14" y="13" width="8" height="8" rx="1.5" fill="#00B388" opacity="0.4" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-white">Sign in</h1>
            <p className="text-xs mt-1" style={{ color: '#566278' }}>
              HPE Morpheus VME Manager
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#8B9AB0' }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium mb-1.5"
                style={{ color: '#8B9AB0' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div
                className="text-xs rounded px-3 py-2"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#FCA5A5',
                }}
              >
                {error}
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                id="remember"
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded"
                style={{ accentColor: '#00B388' }}
              />
              <label
                htmlFor="remember"
                className="text-xs cursor-pointer"
                style={{ color: '#8B9AB0' }}
              >
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full justify-center py-2.5 text-sm font-semibold mt-2"
            >
              {loading ? (
                <>
                  <LoadingSpinner size={14} />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div
        className="text-center py-4 text-xs"
        style={{ color: '#2A3450' }}
      >
        © {new Date().getFullYear()} Hewlett Packard Enterprise. All rights reserved.
      </div>
    </div>
  )
}
