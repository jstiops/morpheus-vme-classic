import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCluster } from '@/api/clouds'
import { listInstances, deleteInstance } from '@/api/instances'
import { listServers, getZoneHistory, startServer, stopServer, restartServer, moveServer, setServerPlacementStrategy, enableMaintenanceMode, leaveMaintenanceMode } from '@/api/servers'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusDot'
import { ArrowLeft, Layers, Server, Monitor, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Play, Square, RotateCcw, MoveRight, Loader2, CheckCircle2, Wrench, Tag, ChevronDown, Trash2, Terminal } from 'lucide-react'
import { formatBytes, formatPercent } from '@/utils/format'
import { consoleUrl } from '@/utils/vmeManagerUrl'
import { clsx } from 'clsx'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'vms', label: 'Virtual Machines' },
  { id: 'hosts', label: 'Hosts' },
  { id: 'tasks', label: 'Tasks & Events' },
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
        {activeTab === 'vms' && (
          <ClusterVMsTab
            clusterId={clusterId}
            clusterZoneId={cluster.zone?.id}
            clusterHosts={cluster.servers ?? []}
          />
        )}
        {activeTab === 'hosts' && (
          <ClusterHostsTab
            clusterServerIds={(cluster.servers ?? []).map((s) => s.id)}
            clusterZoneId={cluster.zone?.id}
          />
        )}
        {activeTab === 'tasks' && cluster.zone?.id && (
          <ClusterTasksTab
            zoneId={cluster.zone.id}
            clusterServerIds={(cluster.servers ?? []).map((s) => s.id)}
          />
        )}
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
    </div>
  )
}

interface MaintOp {
  hostId: number
  hostName: string
  action: 'enable' | 'leave'
  startedAt: number
}

function ClusterHostsTab({ clusterServerIds, clusterZoneId }: { clusterServerIds: number[]; clusterZoneId?: number }) {
  const navigate = useNavigate()
  const [maintOp, setMaintOp] = useState<MaintOp | null>(null)
  const [maintJustDone, setMaintJustDone] = useState(false)
  const [confirmMaint, setConfirmMaint] = useState<{ hostId: number; hostName: string; action: 'enable' | 'disable' } | null>(null)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['servers', 'hypervisors'],
    queryFn: () => listServers({ max: 100, vmHypervisor: true }),
    staleTime: maintOp ? 0 : 30_000,
    refetchInterval: maintOp ? 3_000 : false,
  })

  // VM-level servers in the zone — needed to show which VMs are on a host
  const { data: vmServersData } = useQuery({
    queryKey: ['vm-servers', clusterZoneId],
    queryFn: () => listServers({ max: 200, zoneId: clusterZoneId }),
    enabled: !!clusterZoneId,
    staleTime: 60_000,
  })

  const maintenanceMutation = useMutation({
    mutationFn: ({ id, enable }: { id: number; enable: boolean }) =>
      enable ? enableMaintenanceMode(id) : leaveMaintenanceMode(id),
    onSuccess: (_data, { id, enable }) => {
      const host = (data?.servers ?? []).find((s) => s.id === id)
      setMaintOp({
        hostId: id,
        hostName: host?.name ?? String(id),
        action: enable ? 'enable' : 'leave',
        startedAt: Date.now(),
      })
    },
  })

  // ── Detect maintenance completion ──────────────────────────────────────────
  useEffect(() => {
    if (!maintOp) return
    const server = (data?.servers ?? []).find((s) => s.id === maintOp.hostId)
    if (!server) return
    // "maintenancing" is the transition state; "maintenance" is the final state
    const transitioning = server.status === 'maintenancing'
    const finallyInMaint = !!(server.maintenanceMode || server.status === 'maintenance')
    const fullyLeft = !finallyInMaint && !transitioning
    const isDone = maintOp.action === 'enable' ? finallyInMaint : fullyLeft
    const timedOut = Date.now() - maintOp.startedAt > 60_000
    if (isDone || timedOut) {
      setMaintOp(null)
      setMaintJustDone(true)
      setTimeout(() => setMaintJustDone(false), 2_500)
      refetch()
    }
  }, [data, maintOp, refetch])

  const hosts = (data?.servers ?? [])
    .filter((s) => clusterServerIds.includes(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (isLoading) return <PageLoader />

  return (
    <div className="max-w-5xl space-y-3">
      {/* ── Maintenance progress banner ── */}
      {maintOp && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' }}
        >
          <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#60A5FA' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: '#60A5FA' }}>
              {maintOp.action === 'enable'
                ? `Enabling maintenance mode on ${maintOp.hostName}…`
                : `Leaving maintenance mode on ${maintOp.hostName}…`}
            </p>
            <p className="text-2xs mt-0.5" style={{ color: '#566278' }}>
              Monitoring task progress…
            </p>
          </div>
        </div>
      )}

      {/* ── Done flash ── */}
      {maintJustDone && !maintOp && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'rgba(0,179,136,0.1)', border: '1px solid rgba(0,179,136,0.3)' }}
        >
          <CheckCircle2 size={16} style={{ color: '#00B388' }} />
          <p className="text-xs font-medium" style={{ color: '#00B388' }}>Operation completed</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Hosts</h3>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {hosts.length} host{hosts.length !== 1 ? 's' : ''} in cluster
          </p>
        </div>
        <button className="btn btn-ghost py-1 px-2" onClick={() => refetch()}>
          <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {hosts.length === 0 ? (
        <div className="empty-state">
          <Server size={32} style={{ color: '#566278' }} />
          <p className="text-sm" style={{ color: '#8B9AB0' }}>No hosts found</p>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1E2A45' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>CPU Usage</th>
                <th>Memory</th>
                <th>VMs</th>
                <th>OS</th>
                <th>Agent Version</th>
                <th style={{ width: 120 }}>Maintenance</th>
              </tr>
            </thead>
            <tbody>
              {hosts.map((server) => {
                const cpuPct = server.stats?.cpuUsage ?? 0
                const memUsed = server.stats?.usedMemory ?? server.usedMemory ?? 0
                const memMax = server.stats?.maxMemory ?? server.maxMemory ?? 0
                const memPct = memMax > 0 ? (memUsed / memMax) * 100 : 0

                const isMaintHost = maintOp?.hostId === server.id

                return (
                  <tr
                    key={server.id}
                    className={clsx('cursor-pointer', isMaintHost && 'opacity-60')}
                    onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; navigate(`/hosts/${server.id}`) }}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        {isMaintHost
                          ? <Loader2 size={12} className="animate-spin" style={{ color: '#60A5FA' }} />
                          : <Server size={12} style={{ color: '#60A5FA' }} />
                        }
                        <span className="font-medium" style={{ color: '#60A5FA' }}>{server.name}</span>
                      </div>
                      {server.hostname && server.hostname !== server.name && (
                        <div className="text-2xs font-mono" style={{ color: '#566278' }}>{server.hostname}</div>
                      )}
                    </td>
                    <td><StatusBadge status={server.status} /></td>
                    <td>
                      <span className="font-mono text-xs" style={{ color: '#8B9AB0' }}>
                        {server.internalIp ?? server.externalIp ?? '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16">
                          <div
                            className={clsx('progress-fill', cpuPct > 80 ? 'red' : cpuPct > 60 ? 'yellow' : 'green')}
                            style={{ width: `${Math.min(cpuPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-2xs" style={{ color: '#8B9AB0' }}>{formatPercent(cpuPct)}</span>
                      </div>
                    </td>
                    <td>
                      {memMax > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16">
                            <div
                              className={clsx('progress-fill', memPct > 80 ? 'red' : memPct > 60 ? 'yellow' : 'green')}
                              style={{ width: `${Math.min(memPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-2xs" style={{ color: '#8B9AB0' }}>
                            {formatBytes(memUsed)} / {formatBytes(memMax)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#566278' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: '#1E2A45', color: '#8B9AB0' }}>
                        {server.containers?.length ?? 0}
                      </span>
                    </td>
                    <td style={{ color: '#566278' }}>{server.osMorpheusType ?? server.osType ?? '—'}</td>
                    <td style={{ color: '#566278' }}>{server.agentVersion ?? '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const inMaint = !!(server.maintenanceMode || server.status === 'maintenance' || server.status === 'maintenancing')
                        const isThisHost = maintOp?.hostId === server.id
                        const busy = isThisHost || maintenanceMutation.isPending
                        return (
                          <button
                            className={clsx('btn py-1 px-2 text-xs', inMaint ? 'btn-secondary' : 'btn-ghost')}
                            style={inMaint ? { color: '#F59E0B', borderColor: 'rgba(245,158,11,0.3)' } : {}}
                            disabled={busy || !!maintOp}
                            onClick={() => setConfirmMaint({
                              hostId: server.id,
                              hostName: server.name,
                              action: inMaint ? 'disable' : 'enable',
                            })}
                            title={inMaint ? 'Leave maintenance mode' : 'Enter maintenance mode'}
                          >
                            {busy
                              ? <Loader2 size={12} className="animate-spin" style={{ color: isThisHost ? '#60A5FA' : undefined }} />
                              : <Wrench size={12} style={{ color: inMaint ? '#F59E0B' : '#566278' }} />
                            }
                            {inMaint ? 'Disable' : 'Enable'}
                          </button>
                        )
                      })()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Maintenance Confirm Modal (enable + disable) ── */}
      {confirmMaint && (() => {
        const isEnable = confirmMaint.action === 'enable'
        const vmsOnHost = (vmServersData?.servers ?? []).filter(
          (s) => s.parentServer?.id === confirmMaint.hostId,
        )
        const willMigrate = vmsOnHost.filter(
          (s) => s.placementStrategy === 'auto' || s.placementStrategy === 'failover' || !s.placementStrategy,
        )
        const pinned = vmsOnHost.filter((s) => s.placementStrategy === 'pinned')
        // VMs that could be migrated back (failover strategy pointing to this host)
        const failoverVms = (vmServersData?.servers ?? []).filter(
          (s) => s.placementStrategy === 'failover',
        )

        return (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => !maintenanceMutation.isPending && setConfirmMaint(null)}
          >
            <div
              className="rounded-xl p-6 space-y-4"
              style={{ background: '#141C2E', border: '1px solid #1E2A45', width: 480 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <Wrench size={16} className="shrink-0 mt-0.5" style={{ color: '#F59E0B' }} />
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    {isEnable ? 'Enable' : 'Disable'} Maintenance Mode on {confirmMaint.hostName}?
                  </h2>
                  <p className="text-xs mt-1" style={{ color: '#8B9AB0' }}>
                    {isEnable
                      ? <>Virtual machines with <span className="text-white font-medium">auto</span> or <span className="text-white font-medium">failover</span> placement strategy will be live-migrated to other available hosts.</>
                      : <>This host's resources will become available to the cluster again. Virtual machines that have this host set as their preferred <span className="text-white font-medium">failover</span> host may be automatically migrated back.</>
                    }
                  </p>
                </div>
              </div>

              {isEnable ? (
                vmsOnHost.length === 0 ? (
                  <p className="text-xs px-3 py-2 rounded" style={{ background: '#0D1117', color: '#566278' }}>
                    No virtual machines are currently on this host.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {willMigrate.length > 0 && (
                      <div>
                        <p className="text-2xs font-medium mb-1" style={{ color: '#8B9AB0' }}>
                          Will be migrated ({willMigrate.length}):
                        </p>
                        <div className="space-y-1 max-h-32 overflow-auto">
                          {willMigrate.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: '#0D1117' }}>
                              <Monitor size={11} style={{ color: '#00B388' }} />
                              <span className="text-xs text-white flex-1">{s.name}</span>
                              <span className="text-2xs px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(86,98,120,0.2)', color: '#8B9AB0' }}>
                                {s.placementStrategy ?? 'auto'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {pinned.length > 0 && (
                      <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <p className="text-xs font-medium" style={{ color: '#EF4444' }}>
                          Cannot enable maintenance mode — {pinned.length} pinned VM{pinned.length !== 1 ? 's' : ''} must be moved first
                        </p>
                        <p className="text-2xs" style={{ color: '#8B9AB0' }}>
                          Pinned virtual machines are locked to this host and will not be automatically migrated. Move or change the placement strategy of the following VMs before enabling maintenance mode:
                        </p>
                        <div className="space-y-1 max-h-24 overflow-auto">
                          {pinned.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: '#0D1117' }}>
                              <Monitor size={11} style={{ color: '#566278' }} />
                              <span className="text-xs text-white flex-1">{s.name}</span>
                              <span className="text-2xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>pinned</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              ) : (
                failoverVms.length > 0 ? (
                  <div>
                    <p className="text-2xs font-medium mb-1" style={{ color: '#F59E0B' }}>
                      VMs with failover strategy that may be migrated back ({failoverVms.length}):
                    </p>
                    <div className="space-y-1 max-h-32 overflow-auto">
                      {failoverVms.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: '#0D1117' }}>
                          <Monitor size={11} style={{ color: '#566278' }} />
                          <span className="text-xs text-white flex-1">{s.name}</span>
                          <span className="text-2xs px-1.5 py-0.5 rounded capitalize" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>failover</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs px-3 py-2 rounded" style={{ background: '#0D1117', color: '#566278' }}>
                    No virtual machines with failover strategy found in this cluster.
                  </p>
                )
              )}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  className="btn btn-secondary"
                  onClick={() => setConfirmMaint(null)}
                  disabled={maintenanceMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  style={{ background: 'rgba(245,158,11,0.2)', borderColor: 'rgba(245,158,11,0.4)', color: '#F59E0B' }}
                  disabled={maintenanceMutation.isPending || (isEnable && pinned.length > 0)}
                  onClick={() => {
                    maintenanceMutation.mutate(
                      { id: confirmMaint.hostId, enable: isEnable },
                      { onSuccess: () => setConfirmMaint(null) },
                    )
                  }}
                >
                  {maintenanceMutation.isPending
                    ? <><Loader2 size={13} className="animate-spin" /> {isEnable ? 'Enabling…' : 'Disabling…'}</>
                    : <><Wrench size={13} /> {isEnable ? 'Enable' : 'Disable'} Maintenance Mode</>
                  }
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

interface MoveOp {
  instanceId: number
  instanceName: string
  serverId: number
  targetHostName: string
  startedAt: number
}

function ClusterVMsTab({
  clusterZoneId,
  clusterHosts,
}: {
  clusterId: number
  clusterZoneId?: number
  clusterHosts: Array<{ id: number; name: string }>
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [moveOpen, setMoveOpen] = useState(false)
  const [targetHostId, setTargetHostId] = useState<number | null>(null)
  const [moveOps, setMoveOps] = useState<MoveOp[]>([])
  const [justDone, setJustDone] = useState(false)
  const moveOpsRef = useRef(moveOps)
  moveOpsRef.current = moveOps

  // instanceId → startedAt for tracked power operations
  const [powerOps, setPowerOps] = useState<Map<number, number>>(new Map())

  // Strategy modal
  const [strategyOpen, setStrategyOpen] = useState(false)
  const [newStrategy, setNewStrategy] = useState<'auto' | 'failover' | 'pinned'>('auto')

  // Actions dropdown + delete confirm
  const [actionsOpen, setActionsOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // ── Instance list ──────────────────────────────────────────────────────────
  const busy = moveOps.length > 0 || powerOps.size > 0
  const { data: instData, isLoading: instLoading, isFetching, refetch } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 100 }),
    staleTime: busy ? 0 : 30_000,
    refetchInterval: busy ? 3_000 : false,
  })

  // ── VM-level servers in zone (for host mapping) ────────────────────────────
  const { data: vmServersData, refetch: refetchVmServers } = useQuery({
    queryKey: ['vm-servers', clusterZoneId],
    queryFn: () => listServers({ max: 200, zoneId: clusterZoneId }),
    enabled: !!clusterZoneId,
    staleTime: moveOps.length > 0 ? 0 : 30_000,
    refetchInterval: moveOps.length > 0 ? 4_000 : false,
  })

  // ── Zone processes — active while moves pending ────────────────────────────
  const { data: zoneProcesses } = useQuery({
    queryKey: ['zone-processes-move', clusterZoneId],
    queryFn: () => getZoneHistory(clusterZoneId!, { max: 20 }),
    enabled: !!clusterZoneId && moveOps.length > 0,
    staleTime: 0,
    refetchInterval: moveOps.length > 0 ? 3_000 : false,
  })

  // ── Detect move completion ─────────────────────────────────────────────────
  // Primary signal: every VM's parentServer.name now matches its target host.
  // vmServersData re-polls every 4s while moveOps is non-empty, so this is
  // checked on each fresh poll. Hard timeout at 2 min as safety net.
  useEffect(() => {
    if (moveOps.length === 0) return

    const allMoved = moveOps.every((op) => {
      const srv = (vmServersData?.servers ?? []).find((s) => s.id === op.serverId)
      return srv?.parentServer?.name === op.targetHostName
    })

    const timedOut = moveOps.every((m) => Date.now() - m.startedAt > 120_000)

    if (allMoved || timedOut) {
      setMoveOps([])
      setJustDone(true)
      setTimeout(() => setJustDone(false), 3_000)
      refetch()
      refetchVmServers()
      queryClient.removeQueries({ queryKey: ['zone-processes-move', clusterZoneId] })
    }
  }, [vmServersData, moveOps, clusterZoneId, queryClient, refetch, refetchVmServers])

  // ── Build host-name map: vmServerId → parentServer.name ───────────────────
  const hostMap = new Map<number, string>()
  for (const s of vmServersData?.servers ?? []) {
    if (s.parentServer?.name) hostMap.set(s.id, s.parentServer.name)
  }
  const vms = (instData?.instances ?? [])
    .filter((inst) => !clusterZoneId || inst.cloud?.id === clusterZoneId)
    .sort((a, b) => a.name.localeCompare(b.name))

  const vmServerIdMap = new Map<number, number>() // instanceId → serverId
  for (const inst of vms) {
    if (inst.servers?.[0]) vmServerIdMap.set(inst.id, inst.servers[0])
  }

  // serverId → placementStrategy
  const placementStrategyMap = new Map<number, string>()
  for (const s of vmServersData?.servers ?? []) {
    if (s.placementStrategy) placementStrategyMap.set(s.id, s.placementStrategy)
  }

  // serverId → instanceId (reverse of vmServerIdMap)
  const serverToInstanceMap = new Map<number, number>()
  for (const [instId, srvId] of vmServerIdMap.entries()) {
    serverToInstanceMap.set(srvId, instId)
  }

  // ── Power ops completion detection ────────────────────────────────────────
  const POWER_TRANSITIONING = new Set(['stopping', 'starting', 'restarting', 'queued', 'in-progress', 'pending'])
  useEffect(() => {
    if (powerOps.size === 0) return
    let changed = false
    const next = new Map(powerOps)
    for (const [instId, startedAt] of powerOps) {
      const inst = (instData?.instances ?? []).find((v) => v.id === instId)
      if (!inst) { next.delete(instId); changed = true; continue }
      const elapsed = Date.now() - startedAt
      if (elapsed > 120_000) { next.delete(instId); changed = true; continue }
      // Grace period: don't mark done for first 4s (lets Morpheus register the op)
      if (elapsed > 4_000 && !POWER_TRANSITIONING.has(inst.status.toLowerCase())) {
        next.delete(instId); changed = true
      }
    }
    if (changed) setPowerOps(next)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instData])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const powerMutation = useMutation({
    mutationFn: ({ serverId, action }: { serverId: number; instanceId: number; action: 'start' | 'stop' | 'restart' }) => {
      if (action === 'start') return startServer(serverId)
      if (action === 'stop') return stopServer(serverId)
      return restartServer(serverId)
    },
    onMutate: ({ instanceId }) => {
      // Show spinner immediately on click, before the API responds
      setPowerOps((prev) => new Map([...prev, [instanceId, Date.now()]]))
    },
    onSuccess: (_data, _vars) => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
    },
    onError: (_err, { instanceId }) => {
      // Remove spinner if the API call itself failed
      setPowerOps((prev) => { const next = new Map(prev); next.delete(instanceId); return next })
    },
  })

  const moveMutation = useMutation({
    mutationFn: async ({ serverIds, hostId }: { serverIds: number[]; hostId: number }) => {
      return Promise.all(serverIds.map((sid) => moveServer(sid, hostId)))
    },
    onSuccess: (_data, { serverIds, hostId }) => {
      const targetHost = clusterHosts.find((h) => h.id === hostId)
      const ops: MoveOp[] = []
      for (const inst of vms) {
        const sid = vmServerIdMap.get(inst.id)
        if (sid && serverIds.includes(sid)) {
          ops.push({
            instanceId: inst.id,
            instanceName: inst.name,
            serverId: sid,
            targetHostName: targetHost?.name ?? String(hostId),
            startedAt: Date.now(),
          })
        }
      }
      setMoveOps(ops)
      setMoveOpen(false)
      setSelected(new Set())
      setTargetHostId(null)
    },
  })

  const strategyMutation = useMutation({
    mutationFn: async ({ serverIds, strategy }: { serverIds: number[]; strategy: 'auto' | 'failover' | 'pinned' }) => {
      return Promise.all(serverIds.map((sid) => setServerPlacementStrategy(sid, strategy)))
    },
    onSuccess: () => {
      setStrategyOpen(false)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['vm-servers', clusterZoneId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (instanceIds: number[]) => {
      return Promise.all(instanceIds.map((id) => deleteInstance(id)))
    },
    onSuccess: () => {
      setConfirmDelete(false)
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['instances'] })
    },
  })

  const selectedServerIds = [...selected]
    .map((instId) => vmServerIdMap.get(instId))
    .filter((id): id is number => id != null)

  const anyPinned = selectedServerIds.some((sid) => placementStrategyMap.get(sid) === 'pinned')

  const canDelete = selected.size > 0 &&
    [...selected].every((instId) => vms.find((v) => v.id === instId)?.status?.toLowerCase() === 'stopped')

  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected(selected.size === vms.length ? new Set() : new Set(vms.map((v) => v.id)))

  if (instLoading) return <PageLoader />

  return (
    <div className="space-y-3" style={{ maxWidth: '100%' }}>
      {/* ── Move progress banner (snapshot-style) ── */}
      {moveOps.length > 0 && (() => {
        const allProcs = zoneProcesses?.processes ?? []
        // Pick the most representative running process for progress display
        const activeProc = allProcs.find(
          (p) =>
            (p.status === 'running' || p.status === 'in-progress') &&
            moveOps.some((m) => m.serverId === p.serverId),
        )
        const progressLabel = activeProc
          ? ([activeProc.displayName, activeProc.processType?.name].filter(Boolean).join(' – ') ||
            `Moving ${moveOps.length} VM${moveOps.length !== 1 ? 's' : ''}`)
          : `Moving ${moveOps.length} VM${moveOps.length !== 1 ? 's' : ''} to ${moveOps[0]?.targetHostName}…`
        const progressPct = activeProc?.percent ?? null

        return (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' }}
          >
            <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#60A5FA' }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: '#60A5FA' }}>{progressLabel}</p>
              {moveOps.length > 1 && (
                <p className="text-2xs mt-0.5" style={{ color: '#566278' }}>
                  {moveOps.map((m) => m.instanceName).join(', ')}
                </p>
              )}
              {progressPct != null && (
                <div className="mt-1.5">
                  <div className="progress-bar">
                    <div
                      className="progress-fill green"
                      style={{ width: `${progressPct}%`, transition: 'width 0.5s ease' }}
                    />
                  </div>
                  <p className="text-2xs mt-0.5" style={{ color: '#566278' }}>{progressPct}%</p>
                </div>
              )}
              {progressPct == null && (
                <p className="text-2xs mt-0.5" style={{ color: '#566278' }}>
                  Monitoring task progress…
                </p>
              )}
            </div>
          </div>
        )
      })()}

      {justDone && moveOps.length === 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-lg"
          style={{ background: 'rgba(0,179,136,0.1)', border: '1px solid rgba(0,179,136,0.3)' }}
        >
          <CheckCircle2 size={16} style={{ color: '#00B388' }} />
          <span className="text-xs font-medium" style={{ color: '#00B388' }}>Migration completed</span>
        </div>
      )}

      {/* ── Header / action bar ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-white">Virtual Machines</h3>
            <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
              {selected.size > 0
                ? `${selected.size} of ${vms.length} selected`
                : `${vms.length} VM${vms.length !== 1 ? 's' : ''} in cluster`}
            </p>
          </div>
          {selected.size > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                className="btn btn-secondary py-1.5 px-3"
                onClick={() => setMoveOpen(true)}
                disabled={!!moveOps.length || moveMutation.isPending || anyPinned}
                title={anyPinned ? 'Cannot move pinned VMs — change strategy first' : 'Move selected VMs to another host'}
              >
                <MoveRight size={13} />
                Move Compute ({selected.size})
                {anyPinned && <span className="text-2xs ml-1" style={{ color: '#EF4444' }}>pinned</span>}
              </button>
              <div className="relative">
                <button
                  className="btn btn-secondary py-1.5 px-3"
                  onClick={() => setActionsOpen((v) => !v)}
                  disabled={strategyMutation.isPending || deleteMutation.isPending}
                >
                  Actions
                  <ChevronDown size={12} />
                </button>
                {actionsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} />
                    <div
                      className="absolute left-0 top-full mt-1 z-50 rounded-lg py-1"
                      style={{ background: '#141C2E', border: '1px solid #1E2A45', minWidth: 210 }}
                    >
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5"
                        onClick={() => { setActionsOpen(false); setNewStrategy('auto'); setStrategyOpen(true) }}
                      >
                        <Tag size={13} style={{ color: '#60A5FA' }} />
                        Set Placement Strategy
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                        disabled={!canDelete}
                        title={!canDelete ? 'Only stopped VMs can be deleted' : undefined}
                        onClick={() => { if (canDelete) { setActionsOpen(false); setConfirmDelete(true) } }}
                      >
                        <Trash2 size={13} style={{ color: canDelete ? '#EF4444' : '#566278' }} />
                        <span style={{ color: canDelete ? '#EF4444' : '#566278' }}>Delete</span>
                        {!canDelete && (
                          <span className="ml-auto text-2xs" style={{ color: '#566278' }}>stopped only</span>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="w-px h-4 mx-0.5" style={{ background: '#1E2A45' }} />
              <button
                className="btn btn-secondary py-1.5 px-2"
                onClick={() => selectedServerIds.forEach((sid) => {
                  const instId = serverToInstanceMap.get(sid)
                  if (instId) powerMutation.mutate({ serverId: sid, instanceId: instId, action: 'start' })
                })}
                title="Power On selected"
              >
                <Play size={12} style={{ color: '#00B388' }} />
              </button>
              <button
                className="btn btn-secondary py-1.5 px-2"
                onClick={() => selectedServerIds.forEach((sid) => {
                  const instId = serverToInstanceMap.get(sid)
                  if (instId) powerMutation.mutate({ serverId: sid, instanceId: instId, action: 'stop' })
                })}
                title="Power Off selected"
              >
                <Square size={12} />
              </button>
              <button
                className="btn btn-secondary py-1.5 px-2"
                onClick={() => selectedServerIds.forEach((sid) => {
                  const instId = serverToInstanceMap.get(sid)
                  if (instId) powerMutation.mutate({ serverId: sid, instanceId: instId, action: 'restart' })
                })}
                title="Restart selected"
              >
                <RotateCcw size={12} />
              </button>
            </div>
          )}
        </div>
        <button className="btn btn-ghost py-1 px-2 shrink-0" onClick={() => { refetch(); refetchVmServers() }}>
          <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
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
                <th style={{ width: 32 }}>
                  <input
                    type="checkbox"
                    checked={selected.size === vms.length && vms.length > 0}
                    ref={(el) => { if (el) el.indeterminate = selected.size > 0 && selected.size < vms.length }}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer', accentColor: '#00B388' }}
                  />
                </th>
                <th>Name</th>
                <th>Status</th>
                <th>Host</th>
                <th>Placement Strategy</th>
                <th>IP Address</th>
                <th>Plan</th>
                <th style={{ width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vms.map((inst) => {
                const ip = inst.connectionInfo?.[0]?.ip ?? inst.containers?.[0]?.ip ?? inst.containers?.[0]?.internalIp
                const sid = vmServerIdMap.get(inst.id)
                const hostName = sid ? (hostMap.get(sid) ?? '—') : '—'
                const strategy = sid ? (placementStrategyMap.get(sid) ?? null) : null
                const isPinned = strategy === 'pinned'
                const isMoving = moveOps.some((m) => m.instanceId === inst.id)
                const isPowerOp = powerOps.has(inst.id)
                const isBusy = isMoving || isPowerOp
                const instStatus = inst.status.toLowerCase()

                return (
                  <tr key={inst.id} className={clsx(isBusy && 'opacity-60')}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selected.has(inst.id)}
                        onChange={() => toggleSelect(inst.id)}
                        style={{ cursor: 'pointer', accentColor: '#00B388' }}
                      />
                    </td>
                    <td
                      className="cursor-pointer"
                      onClick={() => navigate(`/vms/${inst.id}`)}
                    >
                      <div className="flex items-center gap-2">
                        {isBusy
                          ? <Loader2 size={12} className="animate-spin" style={{ color: '#60A5FA' }} />
                          : <Monitor size={12} style={{ color: '#00B388' }} />
                        }
                        <span className="font-medium" style={{ color: '#60A5FA' }}>{inst.name}</span>
                      </div>
                    </td>
                    <td><StatusBadge status={inst.status} /></td>
                    <td style={{ color: '#8B9AB0' }}>
                      <div className="flex items-center gap-1.5">
                        <Server size={11} style={{ color: '#566278' }} />
                        {hostName}
                      </div>
                    </td>
                    <td>
                      {strategy ? (
                        <span
                          className="text-2xs px-1.5 py-0.5 rounded capitalize"
                          style={{
                            background: isPinned ? 'rgba(239,68,68,0.15)' : 'rgba(86,98,120,0.2)',
                            color: isPinned ? '#EF4444' : '#8B9AB0',
                          }}
                        >
                          {strategy}
                        </span>
                      ) : (
                        <span style={{ color: '#566278' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span className="font-mono text-xs" style={{ color: '#8B9AB0' }}>{ip ?? '—'}</span>
                    </td>
                    <td style={{ color: '#8B9AB0' }}>{inst.plan?.name ?? '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <button
                          className="btn btn-ghost p-1"
                          title="Power On"
                          disabled={!sid || isBusy || instStatus === 'running'}
                          onClick={() => sid && powerMutation.mutate({ serverId: sid, instanceId: inst.id, action: 'start' })}
                        >
                          <Play size={11} style={{ color: instStatus === 'running' ? '#566278' : '#00B388' }} />
                        </button>
                        <button
                          className="btn btn-ghost p-1"
                          title="Power Off"
                          disabled={!sid || isBusy || instStatus === 'stopped'}
                          onClick={() => sid && powerMutation.mutate({ serverId: sid, instanceId: inst.id, action: 'stop' })}
                        >
                          <Square size={11} style={{ color: '#8B9AB0' }} />
                        </button>
                        <button
                          className="btn btn-ghost p-1"
                          title="Restart"
                          disabled={!sid || isBusy || instStatus === 'stopped'}
                          onClick={() => sid && powerMutation.mutate({ serverId: sid, instanceId: inst.id, action: 'restart' })}
                        >
                          <RotateCcw size={11} style={{ color: '#8B9AB0' }} />
                        </button>
                        <button
                          className="btn btn-ghost p-1"
                          title="Open Console"
                          disabled={!sid}
                          onClick={() => {
                            if (!sid) return
                            window.open(consoleUrl(sid), '_blank', 'width=1024,height=768,noopener')
                          }}
                        >
                          <Terminal size={11} style={{ color: '#8B9AB0' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Set Strategy Modal ── */}
      {strategyOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !strategyMutation.isPending && setStrategyOpen(false)}
        >
          <div
            className="rounded-xl p-6 space-y-5"
            style={{ background: '#141C2E', border: '1px solid #1E2A45', width: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Tag size={15} style={{ color: '#60A5FA' }} />
                Set Placement Strategy
              </h2>
              <p className="text-xs mt-1" style={{ color: '#566278' }}>
                Apply to {selected.size} selected VM{selected.size !== 1 ? 's' : ''}.
              </p>
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {vms.filter((v) => selected.has(v.id)).map((v) => {
                const sid = vmServerIdMap.get(v.id)
                const current = sid ? (placementStrategyMap.get(sid) ?? '—') : '—'
                return (
                  <div key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: '#0D1117' }}>
                    <Monitor size={12} style={{ color: '#00B388' }} />
                    <span className="text-xs text-white flex-1">{v.name}</span>
                    <span className="text-2xs" style={{ color: '#566278' }}>current: {current}</span>
                  </div>
                )
              })}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
                New Strategy <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                className="input"
                value={newStrategy}
                onChange={(e) => setNewStrategy(e.target.value as 'auto' | 'failover' | 'pinned')}
                disabled={strategyMutation.isPending}
              >
                <option value="auto">Auto — Morpheus chooses best host</option>
                <option value="failover">Failover — prefer failover host</option>
                <option value="pinned">Pinned — stay on current host</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                className="btn btn-secondary"
                onClick={() => setStrategyOpen(false)}
                disabled={strategyMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={strategyMutation.isPending}
                onClick={() => strategyMutation.mutate({ serverIds: selectedServerIds, strategy: newStrategy })}
              >
                {strategyMutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Applying…</>
                  : <><Tag size={13} /> Apply</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {confirmDelete && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !deleteMutation.isPending && setConfirmDelete(false)}
        >
          <div
            className="rounded-xl p-6 space-y-5"
            style={{ background: '#141C2E', border: '1px solid #1E2A45', width: 420 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Trash2 size={15} style={{ color: '#EF4444' }} />
                Delete Virtual Machine{selected.size !== 1 ? 's' : ''}
              </h2>
              <p className="text-xs mt-1" style={{ color: '#566278' }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="space-y-1 max-h-40 overflow-auto">
              {vms.filter((v) => selected.has(v.id)).map((v) => (
                <div key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: '#0D1117' }}>
                  <Trash2 size={12} style={{ color: '#EF4444' }} />
                  <span className="text-xs text-white flex-1">{v.name}</span>
                  <span className="text-2xs" style={{ color: '#566278' }}>{v.status}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate([...selected])}
              >
                {deleteMutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Deleting…</>
                  : <><Trash2 size={13} /> Delete {selected.size} VM{selected.size !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Move Modal ── */}
      {moveOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !moveMutation.isPending && setMoveOpen(false)}
        >
          <div
            className="rounded-xl p-6 space-y-5"
            style={{ background: '#141C2E', border: '1px solid #1E2A45', width: 460 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <MoveRight size={15} style={{ color: '#60A5FA' }} />
                Move {selected.size} Virtual Machine{selected.size !== 1 ? 's' : ''}
              </h2>
              <p className="text-xs mt-1" style={{ color: '#566278' }}>
                Performs a live migration while the VMs remain powered on.
              </p>
            </div>

            {/* VM list */}
            <div className="space-y-1 max-h-40 overflow-auto">
              {vms.filter((v) => selected.has(v.id)).map((v) => {
                const sid = vmServerIdMap.get(v.id)
                const currentHost = sid ? (hostMap.get(sid) ?? '—') : '—'
                return (
                  <div key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded" style={{ background: '#0D1117' }}>
                    <Monitor size={12} style={{ color: '#00B388' }} />
                    <span className="text-xs text-white flex-1">{v.name}</span>
                    <span className="text-2xs" style={{ color: '#566278' }}>on {currentHost}</span>
                  </div>
                )
              })}
            </div>

            {/* Target host */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
                Target Host <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <select
                className="input"
                value={targetHostId ?? ''}
                onChange={(e) => setTargetHostId(Number(e.target.value) || null)}
                disabled={moveMutation.isPending}
              >
                <option value="">Select a host…</option>
                {[...clusterHosts].sort((a, b) => a.name.localeCompare(b.name)).map((h) => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="btn btn-secondary"
                onClick={() => setMoveOpen(false)}
                disabled={moveMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!targetHostId || moveMutation.isPending}
                onClick={() => targetHostId && moveMutation.mutate({ serverIds: selectedServerIds, hostId: targetHostId })}
              >
                {moveMutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Initiating…</>
                  : <><MoveRight size={13} /> Move</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function statusIcon(status: string) {
  const s = status.toLowerCase()
  if (s === 'complete' || s === 'success') return <CheckCircle size={14} style={{ color: '#00B388' }} />
  if (s === 'failed' || s === 'error') return <XCircle size={14} style={{ color: '#EF4444' }} />
  if (s === 'warning') return <AlertCircle size={14} style={{ color: '#F59E0B' }} />
  if (s === 'running' || s === 'in-progress') return <RefreshCw size={14} className="animate-spin" style={{ color: '#60A5FA' }} />
  return <Clock size={14} style={{ color: '#566278' }} />
}

function statusColor(status: string) {
  const s = status.toLowerCase()
  if (s === 'complete' || s === 'success') return '#00B388'
  if (s === 'failed' || s === 'error') return '#EF4444'
  if (s === 'warning') return '#F59E0B'
  if (s === 'running' || s === 'in-progress') return '#60A5FA'
  return '#566278'
}

function formatDuration(ms: number | null) {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(0)}s`
  return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000)}s`
}

function ClusterTasksTab({ zoneId, clusterServerIds }: { zoneId: number; clusterServerIds: number[] }) {
  const [max, setMax] = useState(50)

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['zone-history', zoneId, max],
    queryFn: () => getZoneHistory(zoneId, { max }),
    staleTime: 0,
    refetchInterval: (query) => {
      const processes = query.state.data?.processes ?? []
      const hasRunning = processes.some((p) => p.status === 'running' || p.status === 'in-progress')
      return hasRunning ? 3_000 : 10_000
    },
    retry: 0,
  })

  if (isLoading) return <PageLoader />

  // Only show server-level tasks (exclude VM/instance tasks)
  const serverIdSet = new Set(clusterServerIds)
  const processes = (data?.processes ?? []).filter(
    (p) => !p.instanceId && (!p.serverId || serverIdSet.has(p.serverId)),
  )
  const total = data?.meta?.total ?? processes.length

  return (
    <div className="max-w-4xl space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Tasks & Events</h3>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            Showing {processes.length} of {total} total
          </p>
        </div>
        <button className="btn btn-ghost py-1 px-2" onClick={() => refetch()}>
          <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {processes.length === 0 ? (
        <div className="empty-state">
          <Clock size={32} style={{ color: '#566278' }} />
          <p className="text-sm" style={{ color: '#8B9AB0' }}>No task history</p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            {processes.map((proc) => {
              const startDate = proc.startDate ?? proc.dateCreated
              const durationMs =
                proc.duration ??
                (proc.startDate && proc.endDate
                  ? new Date(proc.endDate).getTime() - new Date(proc.startDate).getTime()
                  : null)

              return (
                <div
                  key={proc.id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: '#0D1117', border: '1px solid #1E2A45' }}
                >
                  <div className="mt-0.5 shrink-0">{statusIcon(proc.status)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-white">
                        {[proc.displayName, proc.processType?.name].filter(Boolean).join(' – ') || proc.description || 'Unknown'}
                      </span>
                      <span
                        className="text-2xs px-1.5 py-0.5 rounded"
                        style={{
                          background: `${statusColor(proc.status)}22`,
                          color: statusColor(proc.status),
                        }}
                      >
                        {proc.status}
                        {proc.percent != null && proc.percent < 100 && ` (${proc.percent}%)`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {startDate && (
                        <span className="text-2xs" style={{ color: '#566278' }}>
                          Start: {new Date(startDate).toLocaleString()}
                        </span>
                      )}
                      <span className="text-2xs" style={{ color: '#566278' }}>
                        Duration: {formatDuration(durationMs)}
                      </span>
                      {(proc.createdBy?.username ?? proc.createdBy?.displayName) && (
                        <span className="text-2xs" style={{ color: '#566278' }}>
                          User: {proc.createdBy?.displayName ?? proc.createdBy?.username}
                        </span>
                      )}
                    </div>
                    {proc.reason && (
                      <div className="text-2xs mt-0.5 truncate" style={{ color: '#3A4560' }}>{proc.reason}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {processes.length < total && (
            <button
              className="btn btn-secondary w-full py-2"
              onClick={() => setMax((m) => m + 50)}
              disabled={isFetching}
            >
              {isFetching ? 'Loading…' : `Load more (${total - processes.length} remaining)`}
            </button>
          )}
        </>
      )}
    </div>
  )
}
