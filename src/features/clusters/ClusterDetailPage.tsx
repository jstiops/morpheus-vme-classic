import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCluster } from '@/api/clouds'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ArrowLeft, Layers, Server } from 'lucide-react'
import { formatBytes, formatPercent } from '@/utils/format'
import { clsx } from 'clsx'

export function ClusterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const clusterId = Number(id)

  const { data: cluster, isLoading } = useQuery({
    queryKey: ['cluster', clusterId],
    queryFn: () => getCluster(clusterId),
    enabled: !!clusterId,
    staleTime: 30_000,
    retry: 0,
  })

  if (isLoading) return <PageLoader />

  if (!cluster) return (
    <div className="empty-state">
      <p>Cluster not found</p>
      <button className="btn btn-secondary" onClick={() => navigate('/clusters')}>Back to Clusters</button>
    </div>
  )

  const cpuPct = cluster.workerStats?.cpuUsage ?? 0
  const memUsed = cluster.workerStats?.usedMemory ?? 0
  const memMax = cluster.workerStats?.maxMemory ?? 0
  const memPct = memMax > 0 ? (memUsed / memMax) * 100 : 0

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <button className="btn btn-ghost p-1" onClick={() => navigate('/clusters')}>
          <ArrowLeft size={15} />
        </button>
        <Layers size={16} style={{ color: '#00B388' }} />
        <h1 className="text-base font-semibold text-white flex-1 truncate">{cluster.name}</h1>
        <span
          className="text-xs"
          style={{ color: cluster.status === 'ok' || cluster.status === 'running' ? '#00B388' : '#F59E0B' }}
        >
          {cluster.status}
        </span>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4 max-w-4xl">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="card">
            <div className="card-title">CPU Usage</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="progress-bar flex-1">
                <div
                  className={clsx('progress-fill', cpuPct > 80 ? 'red' : cpuPct > 60 ? 'yellow' : 'green')}
                  style={{ width: `${Math.min(cpuPct, 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#00B388', minWidth: 40 }}>
                {formatPercent(cpuPct)}
              </span>
            </div>
          </div>
          <div className="card">
            <div className="card-title">Memory</div>
            <div className="flex items-center gap-3 mt-2">
              <div className="progress-bar flex-1">
                <div
                  className={clsx('progress-fill', memPct > 80 ? 'red' : memPct > 60 ? 'yellow' : 'green')}
                  style={{ width: `${Math.min(memPct, 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#60A5FA', minWidth: 40 }}>
                {formatPercent(memPct)}
              </span>
            </div>
            <div className="text-2xs mt-1" style={{ color: '#566278' }}>
              {formatBytes(memUsed)} / {formatBytes(memMax)}
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="card">
          <div className="card-title">Properties</div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-2">
            {[
              ['Cloud', cluster.zone?.name],
              ['Type', cluster.type?.name],
              ['Layout', cluster.layout?.name],
              ['Workers', String(cluster.workersCount ?? cluster.servers?.length ?? 0)],
              ['Created', cluster.dateCreated ? new Date(cluster.dateCreated).toLocaleString() : undefined],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="text-xs shrink-0" style={{ color: '#566278', minWidth: 80 }}>{label}:</dt>
                <dd className="text-xs text-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Servers */}
        {(cluster.servers ?? []).length > 0 && (
          <div className="card">
            <div className="card-title">Hosts in Cluster</div>
            <div className="space-y-1 mt-2">
              {(cluster.servers ?? []).map((server) => (
                <button
                  key={server.id}
                  className="flex items-center gap-2 w-full text-left hover:bg-content-card-hover rounded px-2 py-1.5 transition-colors"
                  onClick={() => navigate(`/hosts/${server.id}`)}
                >
                  <Server size={12} style={{ color: '#60A5FA' }} />
                  <span className="text-xs text-white flex-1">{server.name}</span>
                  <span className="text-2xs" style={{ color: '#566278' }}>{server.computeServerType?.nodeType}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
