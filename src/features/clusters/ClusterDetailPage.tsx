import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCluster } from '@/api/clouds'
import { listInstances } from '@/api/instances'
import { listServers, getZoneHistory, startServer, stopServer, restartServer, moveServer } from '@/api/servers'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { StatusBadge } from '@/components/common/StatusDot'
import { ArrowLeft, Layers, Server, Monitor, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Play, Square, RotateCcw, MoveRight, Loader2, CheckCircle2 } from 'lucide-react'
import { formatBytes, formatPercent } from '@/utils/format'
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
        {activeTab === 'hosts' && <ClusterHostsTab clusterServerIds={(cluster.servers ?? []).map((s) => s.id)} />}
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

function ClusterHostsTab({ clusterServerIds }: { clusterServerIds: number[] }) {
  const navigate = useNavigate()
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['servers', 'hypervisors'],
    queryFn: () => listServers({ max: 100, vmHypervisor: true }),
    staleTime: 30_000,
  })

  const hosts = (data?.servers ?? [])
    .filter((s) => clusterServerIds.includes(s.id))
    .sort((a, b) => a.name.localeCompare(b.name))

  if (isLoading) return <PageLoader />

  return (
    <div className="max-w-5xl space-y-3">
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
              </tr>
            </thead>
            <tbody>
              {hosts.map((server) => {
                const cpuPct = server.stats?.cpuUsage ?? 0
                const memUsed = server.stats?.usedMemory ?? server.usedMemory ?? 0
                const memMax = server.stats?.maxMemory ?? server.maxMemory ?? 0
                const memPct = memMax > 0 ? (memUsed / memMax) * 100 : 0

                return (
                  <tr
                    key={server.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/hosts/${server.id}`)}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <Server size={12} style={{ color: '#60A5FA' }} />
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

  // ── Instance list ──────────────────────────────────────────────────────────
  const { data: instData, isLoading: instLoading, isFetching, refetch } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 100 }),
    staleTime: moveOps.length > 0 ? 0 : 30_000,
    refetchInterval: moveOps.length > 0 ? 4_000 : false,
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

  // ── Detect move completion + auto-restart suspended VMs ───────────────────
  useEffect(() => {
    if (moveOps.length === 0) return
    const movingServerIds = new Set(moveOps.map((m) => m.serverId))
    const running = (zoneProcesses?.processes ?? []).filter(
      (p) =>
        (p.status === 'running' || p.status === 'in-progress') &&
        p.serverId != null &&
        movingServerIds.has(p.serverId),
    )
    const timedOut = moveOps.every((m) => Date.now() - m.startedAt > 120_000)
    if ((zoneProcesses !== undefined && running.length === 0) || timedOut) {
      // Auto-start any moved VM that ended up suspended/stopped after migration
      const instances = instData?.instances ?? []
      for (const op of moveOps) {
        const inst = instances.find((i) => i.id === op.instanceId)
        if (inst && (inst.status === 'suspended' || inst.status === 'stopped')) {
          startServer(op.serverId).catch(() => {/* best-effort */})
        }
      }
      setMoveOps([])
      setJustDone(true)
      setTimeout(() => setJustDone(false), 3_000)
      refetch()
      refetchVmServers()
      queryClient.removeQueries({ queryKey: ['zone-processes-move', clusterZoneId] })
    }
  }, [zoneProcesses, moveOps, clusterZoneId, queryClient, refetch, refetchVmServers, instData])

  // ── Build host-name map: vmServerId → parentServer.name ───────────────────
  const hostMap = new Map<number, string>()
  for (const s of vmServersData?.servers ?? []) {
    if (s.parentServer?.name) hostMap.set(s.id, s.parentServer.name)
  }
  const vms = (instData?.instances ?? [])
    .filter((inst) => !clusterZoneId || inst.cloud?.id === clusterZoneId)
    .sort((a, b) => a.name.localeCompare(b.name))

  // Build instanceId → first serverId map from vmServersData
  // Servers don't directly expose instanceId, so we use the shared cache key
  // instance.servers[0] is the serverId — build reverse map from the vm servers list
  // (vmServersData servers each have containers which contain instance info)
  // Simpler: just use instance.servers[0] directly on each row
  const vmServerIdMap = new Map<number, number>() // instanceId → serverId
  for (const inst of vms) {
    if (inst.servers?.[0]) vmServerIdMap.set(inst.id, inst.servers[0])
  }

  // ── Mutations ──────────────────────────────────────────────────────────────
  const powerMutation = useMutation({
    mutationFn: ({ serverId, action }: { serverId: number; action: 'start' | 'stop' | 'restart' }) => {
      if (action === 'start') return startServer(serverId)
      if (action === 'stop') return stopServer(serverId)
      return restartServer(serverId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
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

  const selectedServerIds = [...selected]
    .map((instId) => vmServerIdMap.get(instId))
    .filter((id): id is number => id != null)

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
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-white">Virtual Machines</h3>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {selected.size > 0
              ? `${selected.size} of ${vms.length} selected`
              : `${vms.length} VM${vms.length !== 1 ? 's' : ''} in cluster`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {selected.size > 0 && (
            <>
              <button
                className="btn btn-secondary py-1.5 px-3"
                onClick={() => setMoveOpen(true)}
                disabled={!!moveOps.length || moveMutation.isPending}
                title="Move selected VMs to another host"
              >
                <MoveRight size={13} />
                Move ({selected.size})
              </button>
              <div className="w-px h-4 mx-0.5" style={{ background: '#1E2A45' }} />
              <button
                className="btn btn-secondary py-1.5 px-2"
                onClick={() => selectedServerIds.forEach((sid) => powerMutation.mutate({ serverId: sid, action: 'start' }))}
                title="Power On selected"
              >
                <Play size={12} style={{ color: '#00B388' }} />
              </button>
              <button
                className="btn btn-secondary py-1.5 px-2"
                onClick={() => selectedServerIds.forEach((sid) => powerMutation.mutate({ serverId: sid, action: 'stop' }))}
                title="Power Off selected"
              >
                <Square size={12} />
              </button>
              <button
                className="btn btn-secondary py-1.5 px-2"
                onClick={() => selectedServerIds.forEach((sid) => powerMutation.mutate({ serverId: sid, action: 'restart' }))}
                title="Restart selected"
              >
                <RotateCcw size={12} />
              </button>
            </>
          )}
          <button className="btn btn-ghost py-1 px-2" onClick={() => { refetch(); refetchVmServers() }}>
            <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
          </button>
        </div>
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
                <th>IP Address</th>
                <th>Plan</th>
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {vms.map((inst) => {
                const ip = inst.connectionInfo?.[0]?.ip ?? inst.containers?.[0]?.ip ?? inst.containers?.[0]?.internalIp
                const sid = vmServerIdMap.get(inst.id)
                const hostName = sid ? (hostMap.get(sid) ?? '—') : '—'
                const isMoving = moveOps.some((m) => m.instanceId === inst.id)

                return (
                  <tr key={inst.id} className={clsx(isMoving && 'opacity-50')}>
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
                        {isMoving
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
                      <span className="font-mono text-xs" style={{ color: '#8B9AB0' }}>{ip ?? '—'}</span>
                    </td>
                    <td style={{ color: '#8B9AB0' }}>{inst.plan?.name ?? '—'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <button
                          className="btn btn-ghost p-1"
                          title="Power On"
                          disabled={!sid || powerMutation.isPending || isMoving}
                          onClick={() => sid && powerMutation.mutate({ serverId: sid, action: 'start' })}
                        >
                          <Play size={11} style={{ color: '#00B388' }} />
                        </button>
                        <button
                          className="btn btn-ghost p-1"
                          title="Power Off"
                          disabled={!sid || powerMutation.isPending || isMoving}
                          onClick={() => sid && powerMutation.mutate({ serverId: sid, action: 'stop' })}
                        >
                          <Square size={11} style={{ color: '#8B9AB0' }} />
                        </button>
                        <button
                          className="btn btn-ghost p-1"
                          title="Restart"
                          disabled={!sid || powerMutation.isPending || isMoving}
                          onClick={() => sid && powerMutation.mutate({ serverId: sid, action: 'restart' })}
                        >
                          <RotateCcw size={11} style={{ color: '#8B9AB0' }} />
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
                {clusterHosts.map((h) => (
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
