import axios, { AxiosError, AxiosRequestConfig } from 'axios'
import toast from 'react-hot-toast'

const STORAGE_KEY_ACCESS = 'vme_access_token'
const STORAGE_KEY_REFRESH = 'vme_refresh_token'
const STORAGE_KEY_REMEMBER = 'vme_remember'

export function getAccessToken(): string | null {
  const remember = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true'
  const store = remember ? localStorage : sessionStorage
  return store.getItem(STORAGE_KEY_ACCESS)
}

export function getRefreshToken(): string | null {
  const remember = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true'
  const store = remember ? localStorage : sessionStorage
  return store.getItem(STORAGE_KEY_REFRESH)
}

export function storeTokens(
  accessToken: string,
  refreshToken: string,
  remember: boolean,
) {
  const store = remember ? localStorage : sessionStorage
  localStorage.setItem(STORAGE_KEY_REMEMBER, String(remember))
  store.setItem(STORAGE_KEY_ACCESS, accessToken)
  store.setItem(STORAGE_KEY_REFRESH, refreshToken)
}

export function clearTokens() {
  ;[localStorage, sessionStorage].forEach((s) => {
    s.removeItem(STORAGE_KEY_ACCESS)
    s.removeItem(STORAGE_KEY_REFRESH)
  })
  localStorage.removeItem(STORAGE_KEY_REMEMBER)
}

// ─── Axios Instance ───────────────────────────────────────────────────────────

export const apiClient = axios.create({
  baseURL: '/',
  headers: { 'Content-Type': 'application/json' },
})

// Attach bearer token on every request
apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token && config.headers) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Silent token refresh on 401
let isRefreshing = false
let failedQueue: Array<{
  resolve: (v: string) => void
  reject: (e: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!),
  )
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & {
      _retry?: boolean
    }

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          if (original.headers) original.headers['Authorization'] = `Bearer ${token}`
          return apiClient(original)
        })
      }

      original._retry = true
      isRefreshing = true

      const refreshToken = getRefreshToken()
      const remember = localStorage.getItem(STORAGE_KEY_REMEMBER) === 'true'

      if (!refreshToken) {
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(error)
      }

      try {
        const params = new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: 'morph-api',
        })
        const resp = await axios.post('/oauth/token', params, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
        const { access_token, refresh_token } = resp.data
        storeTokens(access_token, refresh_token, remember)
        processQueue(null, access_token)
        if (original.headers)
          original.headers['Authorization'] = `Bearer ${access_token}`
        return apiClient(original)
      } catch (refreshErr) {
        processQueue(refreshErr, null)
        clearTokens()
        window.location.href = '/login'
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }

    // Surface API errors as toasts (except 401 handled above)
    if (error.response?.status !== 401) {
      const message =
        (error.response?.data as { msg?: string })?.msg ||
        error.message ||
        'API request failed'
      toast.error(message, { duration: 5000 })
    }

    return Promise.reject(error)
  },
)
