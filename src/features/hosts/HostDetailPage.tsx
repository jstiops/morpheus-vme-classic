import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getServer } from '@/api/servers'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusDot'
import { formatBytes, formatPercent } from '@/utils/format'
import { ArrowLeft, Server } from 'lucide-react'
import { clsx } from 'clsx'

export function HostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hostId = Number(id)

  const { data: server, isLoading } = useQuery({
    queryKey: ['server', hostId],
    queryFn: () => getServer(hostId),
    enabled: !!hostId,
    staleTime: 30_000,
  })

  if (isLoading) return <PageLoader />

  if (!server) return (
    <div className="empty-state">
      <p>Host not found</p>
      <button className="btn btn-secondary" onClick={() => navigate('/hosts')}>Back to Hosts</button>
    </div>
  )

  const cpuPct = server.stats?.cpuUsage ?? 0
  const memUsed = server.stats?.usedMemory ?? server.usedMemory ?? 0
  const memMax = server.stats?.maxMemory ?? server.maxMemory ?? 0
  const memPct = memMax > 0 ? (memUsed / memMax) * 100 : 0

  const rows: Array<[string, string | undefined]> = [
    ['Hostname', server.hostname],
    ['OS Type', server.osMorpheusType ?? server.osType],
    ['IP Address', server.internalIp ?? server.externalIp],
    ['Cloud', server.cloud?.name],
    ['Plan', server.plan?.name],
    ['Type', server.computeServerType?.name],
    ['Agent Installed', server.agentInstalled ? 'Yes' : 'No'],
    ['Created', server.dateCreated ? new Date(server.dateCreated).toLocaleString() : undefined],
  ]

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <button className="btn btn-ghost p-1" onClick={() => navigate('/hosts')}>
          <ArrowLeft size={15} />
        </button>
        <Server size={16} style={{ color: '#60A5FA' }} />
        <h1 className="text-base font-semibold text-white flex-1 truncate">{server.name}</h1>
        <StatusBadge status={server.status} />
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
              <span className="text-sm font-semibold" style={{ color: cpuPct > 80 ? '#EF4444' : '#00B388', minWidth: 40 }}>
                {formatPercent(cpuPct)}
              </span>
            </div>
            <div className="text-2xs mt-1" style={{ color: '#566278' }}>{server.maxCores} vCPU</div>
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
              {formatBytes(memUsed)} used / {formatBytes(memMax)} total
            </div>
          </div>
        </div>

        {/* Properties */}
        <div className="card">
          <div className="card-title">Properties</div>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-2">
            {rows.filter(([, v]) => v).map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="text-xs shrink-0" style={{ color: '#566278', minWidth: 110 }}>{label}:</dt>
                <dd className="text-xs text-white truncate">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* VM counts */}
        <div className="card">
          <div className="card-title">Virtual Machines</div>
          <div className="flex gap-6 mt-2">
            <div>
              <div className="text-2xl font-bold" style={{ color: '#00B388' }}>{server.runningCount ?? 0}</div>
              <div className="text-xs" style={{ color: '#566278' }}>Running</div>
            </div>
            <div>
              <div className="text-2xl font-bold" style={{ color: '#8B9AB0' }}>{server.totalCount ?? 0}</div>
              <div className="text-xs" style={{ color: '#566278' }}>Total</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
