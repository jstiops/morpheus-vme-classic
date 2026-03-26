import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getCluster } from '@/api/clouds'
import { listInstances } from '@/api/instances'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusDot'
import { ArrowLeft, Layers, Server, Monitor, RefreshCw } from 'lucide-react'
import { formatBytes, formatPercent } from '@/utils/format'
import { clsx } from 'clsx'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'vms', label: 'Virtual Machines' },
] as const

type TabId = (typeof TABS)[number]['id']

export function ClusterDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const clusterId = Number(id)
  const activeTab = (searchParams.get('tab') as TabId) ?? 'summary'
  const setTab = (tab: TabId) => setSearchParams({ tab }, { replace: true })

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: cluster.status === 'ok' || cluster.status === 'running' ? 'rgba(0,179,136,0.15)' : 'rgba(245,158,11,0.15)',
            color: cluster.status === 'ok' || cluster.status === 'running' ? '#00B388' : '#F59E0B',
          }}
        >
          {cluster.status}
        </span>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={clsx('tab-item', activeTab === tab.id && 'active')}
            onClick={() => setTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'summary' && <ClusterSummaryTab cluster={cluster} />}
        {activeTab === 'vms' && <ClusterVMsTab clusterId={clusterId} clusterZoneId={cluster.zone?.id} />}
      </div>
    </div>
  )
}

function ClusterSummaryTab({ cluster }: { cluster: Awaited<ReturnType<typeof getCluster>> }) {
  const cpuPct = cluster.workerStats?.cpuUsage ?? 0
  const memUsed = cluster.workerStats?.usedMemory ?? 0
  const memMax = cluster.workerStats?.maxMemory ?? 0
  const memPct = memMax > 0 ? (memUsed / memMax) * 100 : 0

  return (
    <div className="space-y-4 max-w-4xl">
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
          {([
            ['Cloud', cluster.zone?.name],
            ['Type', cluster.type?.name],
            ['Layout', cluster.layout?.name],
            ['Workers', String(cluster.workersCount ?? cluster.servers?.length ?? 0)],
            ['Created', cluster.dateCreated ? new Date(cluster.dateCreated).toLocaleString() : undefined],
          ] as [string, string | undefined][]).filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <dt className="text-xs shrink-0" style={{ color: '#566278', minWidth: 80 }}>{label}:</dt>
              <dd className="text-xs text-white">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Hosts */}
      {(cluster.servers ?? []).length > 0 && (
        <div className="card">
          <div className="card-title">Hosts in Cluster</div>
          <div className="space-y-1 mt-2">
            {(cluster.servers ?? []).map((server) => (
              <button
                key={server.id}
                className="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#1E2A45')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                onClick={() => { /* navigate to host not available from cluster server */ }}
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
  )
}

function ClusterVMsTab({ clusterZoneId }: { clusterId: number; clusterZoneId?: number }) {
  const navigate = useNavigate()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 100 }),
    staleTime: 30_000,
  })

  const vms = (data?.instances ?? []).filter(
    (inst) => !clusterZoneId || inst.cloud?.id === clusterZoneId,
  ).sort((a, b) => a.name.localeCompare(b.name))

  if (isLoading) return <PageLoader />

  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Virtual Machines</h3>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {vms.length} VM{vms.length !== 1 ? 's' : ''} in cluster
          </p>
        </div>
        <button className="btn btn-ghost py-1 px-2" onClick={() => refetch()}>
          <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {vms.length === 0 ? (
        <div className="empty-state">
          <Monitor size={32} style={{ color: '#566278' }} />
          <p className="text-sm" style={{ color: '#8B9AB0' }}>No virtual machines found</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1E2A45' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Plan</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {vms.map((inst) => {
                const ip = inst.connectionInfo?.[0]?.ip ?? inst.containers?.[0]?.ip ?? inst.containers?.[0]?.internalIp
                return (
                  <tr
                    key={inst.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/vms/${inst.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <Monitor size={12} style={{ color: '#00B388' }} />
                        <span className="font-medium" style={{ color: '#60A5FA' }}>{inst.name}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={inst.status} /></td>
                    <td>
                      <span className="font-mono text-xs" style={{ color: '#8B9AB0' }}>
                        {ip ?? '—'}
                      </span>
                    </td>
                    <td style={{ color: '#8B9AB0' }}>{inst.plan?.name ?? '—'}</td>
                    <td style={{ color: '#566278' }}>
                      {inst.dateCreated ? new Date(inst.dateCreated).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
