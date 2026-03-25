import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listDataStores } from '@/api/clouds'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { formatBytes } from '@/utils/format'
import { Search, RefreshCw, HardDrive } from 'lucide-react'
import { clsx } from 'clsx'

const DATASTORE_TYPES = ['directory', 'localdir', 'generic', 'localgeneric']

function typeLabel(type: string) {
  if (type === 'directory') return 'Directory Pool'
  if (type === 'generic') return 'Generic'
  if (type === 'vmfs') return 'VMFS'
  return type
}

export function StoragePage() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['datastores'],
    queryFn: () => listDataStores(),
    staleTime: 120_000,
    retry: 0,
  })

  const datastores = (data ?? [])
    .filter((ds) => DATASTORE_TYPES.includes((ds.type ?? '').toLowerCase()))
    .filter(
      (ds) =>
        !search ||
        ds.name.toLowerCase().includes(search.toLowerCase()) ||
        ds.zone?.name?.toLowerCase().includes(search.toLowerCase()),
    )

  if (isLoading) return <PageLoader />

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <div>
          <h1 className="text-base font-semibold text-white">Storage</h1>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {datastores.length} datastores
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#566278' }} />
            <input
              className="input text-xs py-1 pl-7 pr-3 h-7"
              style={{ width: 180 }}
              placeholder="Filter datastores…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost p-1.5" onClick={() => refetch()}>
            <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {datastores.length === 0 ? (
          <div className="empty-state">
            <HardDrive size={32} style={{ color: '#566278' }} />
            <p className="text-sm font-medium" style={{ color: '#8B9AB0' }}>No datastores found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cloud</th>
                <th>Type</th>
                <th>Capacity</th>
                <th>Free</th>
                <th>Usage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {datastores.map((ds) => {
                const storMax = ds.storageSize ?? 0
                const storFree = ds.freeSpace ?? 0
                const storUsed = storMax > 0 ? storMax - storFree : 0
                const pct = storMax > 0 ? (storUsed / storMax) * 100 : 0

                return (
                  <tr
                    key={ds.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/storage/${ds.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <HardDrive size={12} style={{ color: '#F59E0B' }} />
                        <span className="font-medium text-white">{ds.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#8B9AB0' }}>{ds.zone?.name ?? '—'}</td>
                    <td style={{ color: '#566278' }}>{typeLabel(ds.type)}</td>
                    <td style={{ color: '#D4D9E3' }}>
                      {storMax > 0 ? formatBytes(storMax) : '—'}
                    </td>
                    <td style={{ color: '#8B9AB0' }}>
                      {storFree > 0 ? formatBytes(storFree) : '—'}
                    </td>
                    <td>
                      {storMax > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-20">
                            <div
                              className={clsx(
                                'progress-fill',
                                pct > 85 ? 'red' : pct > 70 ? 'yellow' : 'green',
                              )}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-2xs" style={{ color: '#8B9AB0' }}>{pct.toFixed(0)}%</span>
                        </div>
                      ) : (
                        <span style={{ color: '#566278' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="text-xs"
                        style={{ color: ds.online !== false ? '#00B388' : '#EF4444' }}
                      >
                        {ds.online !== false ? 'online' : 'offline'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div
        className="flex items-center gap-4 px-4 py-1.5 text-2xs"
        style={{ borderTop: '1px solid #1E2A45', color: '#566278', background: '#0D1117' }}
      >
        <span>Showing {datastores.length} datastores</span>
        {isFetching && <span style={{ color: '#00B388' }}>Refreshing…</span>}
      </div>
    </div>
  )
}
