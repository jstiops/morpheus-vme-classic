import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Load runtime config before rendering. /config.json is written once by
// deploy.sh and survives future builds (rsync only touches dist/).
async function bootstrap() {
  try {
    const resp = await fetch('/config.json')
    if (resp.ok) {
      const cfg = await resp.json()
      if (cfg.vmeManagerUrl) {
        (window as unknown as Record<string, unknown>).__VME_MANAGER_URL__ = cfg.vmeManagerUrl
      }
    }
  } catch {
    // config.json absent (local dev) — vmeManagerUrl falls back to origin
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

bootstrap()
