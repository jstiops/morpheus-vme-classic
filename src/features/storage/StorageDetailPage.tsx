import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listDataStores } from '@/api/clouds'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ArrowLeft, HardDrive } from 'lucide-react'
import { formatBytes } from '@/utils/format'
import { clsx } from 'clsx'

export function StorageDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dsId = Number(id)

  const { data: datastores, isLoading } = useQuery({
    queryKey: ['datastores'],
    queryFn: () => listDataStores(),
    staleTime: 120_000,
    retry: 0,
  })

  if (isLoading) return <PageLoader />

  const ds = datastores?.find((d) => d.id === dsId)

  if (!ds) return (
    <div className="empty-state">
      <p>Datastore not found</p>
      <button className="btn btn-secondary" onClick={() => navigate('/storage')}>Back to Storage</button>
    </div>
  )

  const storMax = ds.storageSize ?? 0
  const storFree = ds.freeSpace ?? 0
  const storUsed = storMax > 0 ? storMax - storFree : 0
  const storPct = storMax > 0 ? (storUsed / storMax) * 100 : 0

  const typeLabel =
    ds.type === 'directory' ? 'Directory Pool'
    : ds.type === 'generic' ? 'Generic'
    : ds.type === 'vmfs' ? 'VMFS'
    : ds.type

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <button className="btn btn-ghost p-1" onClick={() => navigate('/storage')}>
          <ArrowLeft size={15} />
        </button>
        <HardDrive size={16} style={{ color: '#F59E0B' }} />
        <h1 className="text-base font-semibold text-white flex-1 truncate">{ds.name}</h1>
        <span
          className="text-xs"
          style={{ color: ds.online !== false ? '#00B388' : '#EF4444' }}
        >
          {ds.online !== false ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <button className="tab-item active">Summary</button>
      </div>

      {/* Summary content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 gap-4 max-w-5xl">
          {/* Identity */}
          <div className="col-span-3">
            <div
              className="flex items-center gap-4 p-4 rounded-lg"
              style={{ background: '#141C2E', border: '1px solid #1E2A45' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
              >
                <HardDrive size={22} style={{ color: '#F59E0B' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">{ds.name}</h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs" style={{ color: '#566278' }}>{ds.zone?.name}</span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ background: '#1E2A45', color: '#8B9AB0' }}
                  >
                    {typeLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Capacity */}
          {storMax > 0 && (
            <div className="card col-span-2">
              <div className="card-title">Capacity</div>
              <div className="space-y-3 mt-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs" style={{ color: '#8B9AB0' }}>Used Space</span>
                    <span
                      className="text-xs font-medium"
                      style={{ color: storPct > 80 ? '#EF4444' : storPct > 70 ? '#F59E0B' : '#00B388' }}
                    >
                      {formatBytes(storUsed)} / {formatBytes(storMax)}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={clsx('progress-fill', storPct > 85 ? 'red' : storPct > 70 ? 'yellow' : 'green')}
                      style={{ width: `${Math.min(storPct, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-3" style={{ borderTop: '1px solid #1E2A45' }}>
                {[
                  ['Total', formatBytes(storMax)],
                  ['Used', formatBytes(storUsed)],
                  ['Free', formatBytes(storFree)],
                ].map(([label, value]) => (
                  <div key={label} className="text-center">
                    <div className="text-sm font-medium text-white">{value}</div>
                    <div className="text-2xs mt-0.5" style={{ color: '#566278' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Properties */}
          <div className="card">
            <div className="card-title">Properties</div>
            <dl className="space-y-2.5 mt-2">
              {[
                ['Name', ds.name],
                ['Type', typeLabel],
                ['Cloud', ds.zone?.name],
                ['Status', ds.online !== false ? 'Online' : 'Offline'],
              ].map(([label, value]) => (
                <div key={label as string} className="flex gap-2">
                  <dt className="text-xs shrink-0" style={{ color: '#566278', width: 70 }}>{label}:</dt>
                  <dd className="text-xs text-white">{value as string}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
