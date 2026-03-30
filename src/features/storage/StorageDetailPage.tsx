import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listDataStores, listClusters } from '@/api/clouds'
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

  const { data: clustersData } = useQuery({
    queryKey: ['clusters'],
    queryFn: () => listClusters(),
    staleTime: 120_000,
    retry: 0,
  })

  if (isLoading) return <PageLoader />

  const ds = datastores?.find((d) => d.id === dsId)

  // Cluster name: prefer direct reference on datastore; fall back to zone match
  const clusterName = ds?.cluster?.name
    ?? clustersData?.clusters?.find((c) => c.zone?.id === ds?.zone?.id)?.name

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

  const typeLabel = ds.datastoreType?.name
    ?? (ds.type === 'vmfs' ? 'VMFS' : ds.type)

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
              {([
                ['Name',    ds.name],
                ['Type',    typeLabel],
                ['Cluster', clusterName],
                ['Status',  ds.online !== false ? 'Online' : 'Offline'],
              ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex gap-2">
                  <dt className="text-xs shrink-0" style={{ color: '#566278', width: 70 }}>{label}:</dt>
                  <dd className="text-xs text-white">{value}</dd>
                </div>
              ))}
              {ds.defaultStore != null && (
                <div className="flex gap-2">
                  <dt className="text-xs shrink-0" style={{ color: '#566278', width: 70 }}>Default:</dt>
                  <dd className="text-xs" style={{ color: ds.defaultStore ? '#00B388' : '#6B7280' }}>
                    {ds.defaultStore ? 'Yes' : 'No'}
                  </dd>
                </div>
              )}
              {ds.heartbeatTarget != null && (
                <div className="flex gap-2">
                  <dt className="text-xs shrink-0" style={{ color: '#566278', width: 70 }}>Heartbeat:</dt>
                  <dd className="text-xs" style={{ color: ds.heartbeatTarget ? '#00B388' : '#6B7280' }}>
                    {ds.heartbeatTarget ? 'Yes' : 'No'}
                  </dd>
                </div>
              )}
              {ds.checkpointTarget != null && (
                <div className="flex gap-2">
                  <dt className="text-xs shrink-0" style={{ color: '#566278', width: 70 }}>Checkpoint:</dt>
                  <dd className="text-xs" style={{ color: ds.checkpointTarget ? '#00B388' : '#6B7280' }}>
                    {ds.checkpointTarget ? 'Yes' : 'No'}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
