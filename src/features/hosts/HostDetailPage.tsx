import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getServer, getServerHistory } from '@/api/servers'
import { listInstances } from '@/api/instances'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusDot'
import { formatBytes, formatPercent } from '@/utils/format'
import { ArrowLeft, Server, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { formatDistanceToNow } from 'date-fns'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'tasks', label: 'Tasks & Events' },
] as const

type TabId = (typeof TABS)[number]['id']

function statusIcon(status: string) {
  const s = status.toLowerCase()
  if (s === 'complete' || s === 'success') return <CheckCircle size={14} style={{ color: '#00B388' }} />
  if (s === 'failed' || s === 'error') return <XCircle size={14} style={{ color: '#EF4444' }} />
  if (s === 'warning') return <AlertCircle size={14} style={{ color: '#F59E0B' }} />
  if (s === 'running' || s === 'in-progress') return <RefreshCw size={14} className="animate-spin" style={{ color: '#60A5FA' }} />
  return <Clock size={14} style={{ color: '#566278' }} />
}

export function HostDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const hostId = Number(id)
  const activeTab = (searchParams.get('tab') as TabId) ?? 'summary'
  const setTab = (tab: TabId) => setSearchParams({ tab }, { replace: true })

  const { data: server, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['server', hostId],
    queryFn: () => getServer(hostId),
    enabled: !!hostId,
    staleTime: 30_000,
  })

  const { data: instancesData } = useQuery({
    queryKey: ['instances', { serverId: hostId }],
    queryFn: () => listInstances({ serverId: hostId, max: 100 }),
    enabled: !!hostId,
    staleTime: 30_000,
  })

  const hostInstances = instancesData?.instances ?? []
  const runningCount = hostInstances.filter((i) => i.status === 'running').length
  const totalCount = hostInstances.length

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <button className="btn btn-ghost p-1" onClick={() => navigate('/hosts')}>
          <ArrowLeft size={15} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-base font-semibold text-white truncate">{server.name}</h1>
          <StatusBadge status={server.status} />
          {isFetching && <RefreshCw size={12} className="animate-spin" style={{ color: '#566278' }} />}
        </div>
        <button className="btn btn-ghost py-1.5 px-2" onClick={() => refetch()}>
          <RefreshCw size={13} />
        </button>
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
        {activeTab === 'summary' && (
          <HostSummaryTab server={server} cpuPct={cpuPct} memUsed={memUsed} memMax={memMax} memPct={memPct} runningCount={runningCount} totalCount={totalCount} />
        )}
        {activeTab === 'monitor' && (
          <HostMonitorTab server={server} cpuPct={cpuPct} memUsed={memUsed} memMax={memMax} memPct={memPct} />
        )}
        {activeTab === 'tasks' && <HostTasksTab hostId={hostId} />}
      </div>
    </div>
  )
}

function HostSummaryTab({
  server,
  cpuPct,
  memUsed,
  memMax,
  memPct,
  runningCount,
  totalCount,
}: {
  server: Awaited<ReturnType<typeof getServer>>
  cpuPct: number
  memUsed: number
  memMax: number
  memPct: number
  runningCount: number
  totalCount: number
}) {
  return (
    <div className="grid grid-cols-3 gap-4 max-w-5xl">
      {/* Identity */}
      <div className="col-span-3">
        <div
          className="flex items-center gap-4 p-4 rounded-lg"
          style={{ background: '#141C2E', border: '1px solid #1E2A45' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)' }}
          >
            <Server size={22} style={{ color: '#60A5FA' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">{server.name}</h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <StatusBadge status={server.status} />
              <span className="text-xs" style={{ color: '#566278' }}>{server.cloud?.name}</span>
              {(server.internalIp ?? server.externalIp) && (
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{ background: '#1E2A45', color: '#8B9AB0' }}
                >
                  {server.internalIp ?? server.externalIp}
                </span>
              )}
            </div>
          </div>
          {server.plan && (
            <div className="text-xs px-2.5 py-1 rounded shrink-0" style={{ background: '#1E2A45', color: '#8B9AB0' }}>
              {server.plan.name}
            </div>
          )}
        </div>
      </div>

      {/* Resources */}
      <div className="card">
        <div className="card-title">Resources</div>
        <div className="space-y-4 mt-2">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs" style={{ color: '#8B9AB0' }}>CPU Usage</span>
              <span className="text-xs font-medium" style={{ color: cpuPct > 80 ? '#EF4444' : '#00B388' }}>
                {formatPercent(cpuPct)}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={clsx('progress-fill', cpuPct > 80 ? 'red' : cpuPct > 60 ? 'yellow' : 'green')}
                style={{ width: `${Math.min(cpuPct, 100)}%` }}
              />
            </div>
            <div className="text-2xs mt-1" style={{ color: '#566278' }}>{server.maxCores} vCPU</div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-xs" style={{ color: '#8B9AB0' }}>Memory</span>
              <span className="text-xs font-medium" style={{ color: '#60A5FA' }}>
                {formatBytes(memUsed)} / {formatBytes(memMax)}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className={clsx('progress-fill', memPct > 80 ? 'red' : memPct > 60 ? 'yellow' : 'green')}
                style={{ width: `${Math.min(memPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Properties */}
      <div className="card">
        <div className="card-title">Properties</div>
        <dl className="space-y-2.5 mt-2">
          {[
            ['Hostname', server.hostname],
            ['OS Type', server.osMorpheusType ?? server.osType],
            ['IP Address', server.internalIp ?? server.externalIp],
            ['Cloud', server.cloud?.name],
            ['Plan', server.plan?.name],
            ['Type', server.computeServerType?.name],
            ['Agent Installed', server.agentInstalled ? 'Yes' : 'No'],
            ['Created', server.dateCreated ? new Date(server.dateCreated).toLocaleString() : undefined],
          ]
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label as string} className="flex gap-2">
                <dt className="text-xs shrink-0" style={{ color: '#566278', width: 110 }}>{label}:</dt>
                <dd className="text-xs text-white truncate">{value as string}</dd>
              </div>
            ))}
        </dl>
      </div>

      {/* Virtual Machines */}
      <div className="card">
        <div className="card-title">Virtual Machines</div>
        <div className="flex gap-6 mt-3">
          <div>
            <div className="text-2xl font-bold" style={{ color: '#00B388' }}>{runningCount}</div>
            <div className="text-xs mt-0.5" style={{ color: '#566278' }}>Running</div>
          </div>
          <div>
            <div className="text-2xl font-bold" style={{ color: '#8B9AB0' }}>{totalCount}</div>
            <div className="text-xs mt-0.5" style={{ color: '#566278' }}>Total</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HostMonitorTab({
  server,
  cpuPct,
  memUsed,
  memMax,
  memPct,
}: {
  server: Awaited<ReturnType<typeof getServer>>
  cpuPct: number
  memUsed: number
  memMax: number
  memPct: number
}) {
  const storUsed = server.usedStorage ?? 0
  const storMax = server.maxStorage ?? 0
  const storPct = storMax > 0 ? (storUsed / storMax) * 100 : 0

  return (
    <div className="grid grid-cols-3 gap-4 max-w-5xl">
      {[
        { label: 'CPU Usage', value: formatPercent(cpuPct), sub: `${server.maxCores} vCPU`, pct: cpuPct },
        { label: 'Memory', value: `${formatBytes(memUsed)} / ${formatBytes(memMax)}`, sub: formatPercent(memPct), pct: memPct },
        { label: 'Storage', value: storMax > 0 ? `${formatBytes(storUsed)} / ${formatBytes(storMax)}` : '—', sub: storMax > 0 ? formatPercent(storPct) : '', pct: storPct },
      ].map(({ label, value, sub, pct }) => (
        <div key={label} className="card">
          <div className="card-title">{label}</div>
          <div className="mt-3">
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs mt-1" style={{ color: '#566278' }}>{sub}</div>
          </div>
          <div className="progress-bar mt-3">
            <div
              className={clsx('progress-fill', pct > 80 ? 'red' : pct > 60 ? 'yellow' : 'green')}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function HostTasksTab({ hostId }: { hostId: number }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['server-history', hostId],
    queryFn: () => getServerHistory(hostId),
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: 0,
  })

  if (isLoading) return <PageLoader />

  const processes = data?.processes ?? []

  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Tasks & Events</h3>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {processes.length} event{processes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button className="btn btn-ghost py-1 px-2" onClick={() => refetch()}>
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {processes.length === 0 ? (
        <div className="empty-state">
          <Clock size={32} style={{ color: '#566278' }} />
          <p className="text-sm" style={{ color: '#8B9AB0' }}>No task history</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1E2A45' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 28 }} />
                <th>Task</th>
                <th>Status</th>
                <th>Duration</th>
                <th>User</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((proc) => {
                const ts = proc.startDate ?? proc.dateCreated
                let ago = ''
                try { ago = formatDistanceToNow(new Date(ts), { addSuffix: true }) } catch { ago = ts }
                const durationMs =
                  proc.duration ??
                  (proc.startDate && proc.endDate
                    ? new Date(proc.endDate).getTime() - new Date(proc.startDate).getTime()
                    : null)

                return (
                  <tr key={proc.id}>
                    <td className="text-center">{statusIcon(proc.status)}</td>
                    <td>
                      <div className="font-medium text-white">
                        {proc.displayName ?? proc.processType?.name ?? proc.description ?? 'Unknown'}
                      </div>
                      {proc.reason && (
                        <div className="text-2xs mt-0.5 truncate" style={{ color: '#566278' }}>{proc.reason}</div>
                      )}
                    </td>
                    <td>
                      <span className={clsx('text-xs',
                        proc.status.toLowerCase() === 'complete' || proc.status.toLowerCase() === 'success' ? 'text-green-400'
                          : proc.status.toLowerCase() === 'failed' ? 'text-red-400' : 'text-gray-400'
                      )}>
                        {proc.status}
                      </span>
                    </td>
                    <td style={{ color: '#8B9AB0' }}>
                      {durationMs != null ? (durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`) : '—'}
                    </td>
                    <td style={{ color: '#8B9AB0' }}>
                      {proc.createdBy?.username ?? proc.createdBy?.displayName ?? '—'}
                    </td>
                    <td style={{ color: '#566278' }} title={ts}>{ago}</td>
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
