import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  Terminal,
  Camera,
  RefreshCw,
  ExternalLink,
  MoveRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import { getInstance, startInstance, stopInstance, restartInstance } from '@/api/instances'
import { consoleUrl } from '@/utils/vmeManagerUrl'
import { getServer, listServers, moveServer } from '@/api/servers'
import { StatusBadge } from '@/components/common/StatusDot'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { SummaryTab } from './tabs/SummaryTab'
import { SnapshotsTab } from './tabs/SnapshotsTab'
import { TasksTab } from './tabs/TasksTab'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'snapshots', label: 'Snapshots' },
  { id: 'tasks', label: 'Tasks & Events' },
] as const

type TabId = (typeof TABS)[number]['id']

export function VMDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = (searchParams.get('tab') as TabId) ?? 'summary'

  const instanceId = Number(id)

  const { data: instance, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['instance', instanceId],
    queryFn: () => getInstance(instanceId),
    staleTime: 15_000,
    enabled: !!instanceId,
  })

  const [moveOpen, setMoveOpen] = useState(false)
  const [targetHostId, setTargetHostId] = useState<number | null>(null)
  const [moveOp, setMoveOp] = useState<{ targetHostName: string; startedAt: number } | null>(null)
  const [moveJustDone, setMoveJustDone] = useState(false)

  // Fetch the VM's own server record — has parentServer (= hypervisor) and interfaces (= networks)
  const vmServerId = instance?.servers?.[0]
  const { data: vmServer } = useQuery({
    queryKey: ['server', vmServerId],
    queryFn: () => getServer(vmServerId!),
    enabled: !!vmServerId,
    staleTime: moveOp ? 0 : 30_000,
    refetchInterval: moveOp ? 4_000 : false,
    retry: 0,
  })

  // Available hosts: all hypervisors in the same zone, excluding current host
  const { data: hypervisorsData } = useQuery({
    queryKey: ['servers', 'hypervisors'],
    queryFn: () => listServers({ max: 100, vmHypervisor: true }),
    staleTime: 60_000,
  })
  const availableHosts = (hypervisorsData?.servers ?? [])
    .filter(h => h.zone?.id === instance?.cloud?.id && h.id !== vmServer?.parentServer?.id)
    .sort((a, b) => a.name.localeCompare(b.name))

  const moveMutation = useMutation({
    mutationFn: ({ serverId, hostId }: { serverId: number; hostId: number }) =>
      moveServer(serverId, hostId),
    onSuccess: (_data, { hostId }) => {
      const target = availableHosts.find(h => h.id === hostId)
      setMoveOp({ targetHostName: target?.name ?? String(hostId), startedAt: Date.now() })
      setMoveOpen(false)
      setTargetHostId(null)
    },
  })

  // Detect move completion
  useEffect(() => {
    if (!moveOp || !vmServer) return
    const arrived = vmServer.parentServer?.name === moveOp.targetHostName
    const timedOut = Date.now() - moveOp.startedAt > 120_000
    if (arrived || timedOut) {
      setMoveOp(null)
      setMoveJustDone(true)
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      setTimeout(() => setMoveJustDone(false), 3_000)
    }
  }, [vmServer, moveOp, queryClient])

  const mutation = useMutation({
    mutationFn: async (action: string) => {
      const fns: Record<string, (id: number) => Promise<unknown>> = {
        start: startInstance,
        stop: stopInstance,
        restart: restartInstance,
      }
      return fns[action](instanceId)
    },
    onSuccess: (_data, action) => {
      const labels: Record<string, string> = {
        start: 'Power On',
        stop: 'Power Off',
        restart: 'Restart',
      }
      toast.success(`${labels[action]} initiated`)
      queryClient.invalidateQueries({ queryKey: ['instance', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
    },
  })

  const setTab = (tab: TabId) => {
    setSearchParams({ tab }, { replace: true })
  }

  if (isLoading) return <PageLoader />
  if (!instance) {
    return (
      <div className="empty-state">
        <p>VM not found</p>
        <button className="btn btn-secondary" onClick={() => navigate('/vms')}>
          Back to VMs
        </button>
      </div>
    )
  }

  const isRunning = instance.status === 'running'
  const isStopped = instance.status === 'stopped'
  const isMutating = mutation.isPending

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb + Title */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <button
          className="btn btn-ghost p-1"
          onClick={() => navigate('/vms')}
          title="Back to VMs"
        >
          <ArrowLeft size={15} />
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <h1 className="text-base font-semibold text-white truncate">
            {instance.name}
          </h1>
          <StatusBadge status={instance.status} />
          {isFetching && (
            <RefreshCw size={12} className="animate-spin" style={{ color: '#566278' }} />
          )}

          {/* vCenter-style icon toolbar */}
          <div
            className="flex items-center"
            style={{
              border: '1px solid #1E2A45',
              borderRadius: 6,
              overflow: 'hidden',
              marginLeft: 8,
            }}
          >
            {[
              {
                icon: <Play size={16} style={{ color: isRunning || isMutating ? '#3A4560' : '#00B388' }} />,
                title: 'Power On',
                disabled: isRunning || isMutating,
                onClick: () => mutation.mutate('start'),
              },
              {
                icon: <Square size={16} style={{ color: isStopped || isMutating ? '#3A4560' : '#8B9AB0' }} />,
                title: 'Power Off',
                disabled: isStopped || isMutating,
                onClick: () => mutation.mutate('stop'),
              },
              {
                icon: <RotateCcw size={16} style={{ color: isStopped || isMutating ? '#3A4560' : '#8B9AB0' }} />,
                title: 'Restart',
                disabled: isStopped || isMutating,
                onClick: () => mutation.mutate('restart'),
              },
              null, // divider
              {
                icon: <Camera size={16} style={{ color: '#8B9AB0' }} />,
                title: 'Take Snapshot',
                disabled: false,
                onClick: () => setTab('snapshots'),
              },
              {
                icon: (
                  <span className="flex items-center gap-0.5">
                    <Terminal size={16} style={{ color: vmServer ? '#8B9AB0' : '#3A4560' }} />
                    <ExternalLink size={10} style={{ color: vmServer ? '#566278' : '#3A4560' }} />
                  </span>
                ),
                title: 'Open Console',
                disabled: !vmServer,
                onClick: () => vmServer && window.open(consoleUrl(vmServer.id), '_blank', 'width=1024,height=768,noopener'),
              },
            ].map((btn, i) =>
              btn === null ? (
                <div key={i} style={{ width: 1, alignSelf: 'stretch', background: '#1E2A45' }} />
              ) : (
                <button
                  key={i}
                  title={btn.title}
                  disabled={btn.disabled}
                  onClick={btn.onClick}
                  style={{
                    padding: '7px 10px',
                    background: 'transparent',
                    cursor: btn.disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  onMouseEnter={(e) => {
                    if (!btn.disabled) (e.currentTarget as HTMLButtonElement).style.background = '#1E2A45'
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                  }}
                >
                  {btn.icon}
                </button>
              )
            )}
          </div>

          {/* Move Compute button */}
          <button
            className="btn btn-secondary py-1.5 px-3"
            title="Move to another host"
            disabled={!!moveOp || !vmServer}
            onClick={() => setMoveOpen(true)}
          >
            <MoveRight size={13} />
            Move
          </button>

        </div>

        <button
          className="btn btn-ghost py-1.5 px-2"
          onClick={() => refetch()}
          title="Refresh"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Move progress banner */}
      {moveOp && (
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(96,165,250,0.08)', borderBottom: '1px solid rgba(96,165,250,0.2)' }}>
          <Loader2 size={15} className="animate-spin shrink-0" style={{ color: '#60A5FA' }} />
          <p className="text-xs" style={{ color: '#60A5FA' }}>
            Moving to {moveOp.targetHostName}… monitoring task progress.
          </p>
        </div>
      )}
      {moveJustDone && !moveOp && (
        <div className="flex items-center gap-3 px-4 py-2" style={{ background: 'rgba(0,179,136,0.08)', borderBottom: '1px solid rgba(0,179,136,0.2)' }}>
          <CheckCircle2 size={14} style={{ color: '#00B388' }} />
          <p className="text-xs font-medium" style={{ color: '#00B388' }}>Migration completed</p>
        </div>
      )}

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
        {activeTab === 'summary' && <SummaryTab instance={instance} vmServer={vmServer} />}
        {activeTab === 'snapshots' && <SnapshotsTab instanceId={instanceId} />}
        {activeTab === 'tasks' && vmServerId && <TasksTab serverId={vmServerId} />}
      </div>

      {/* Move Compute modal */}
      {moveOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(0,0,0,0.6)' }}
          onClick={() => !moveMutation.isPending && setMoveOpen(false)}
        >
          <div
            className="rounded-xl p-6 space-y-4"
            style={{ background: '#141C2E', border: '1px solid #1E2A45', width: 400 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <MoveRight size={16} className="shrink-0 mt-0.5" style={{ color: '#60A5FA' }} />
              <div>
                <h2 className="text-sm font-semibold text-white">Move Compute — {instance.name}</h2>
                <p className="text-xs mt-1" style={{ color: '#8B9AB0' }}>
                  Currently on: <span className="text-white">{vmServer?.parentServer?.name ?? '—'}</span>
                </p>
              </div>
            </div>

            <div className="space-y-1">
              {availableHosts.length === 0 ? (
                <p className="text-xs px-3 py-2 rounded" style={{ background: '#0D1117', color: '#566278' }}>
                  No other hosts available in this cloud.
                </p>
              ) : availableHosts.map(h => (
                <button
                  key={h.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded text-left"
                  style={{
                    background: targetHostId === h.id ? 'rgba(96,165,250,0.15)' : '#0D1117',
                    border: `1px solid ${targetHostId === h.id ? 'rgba(96,165,250,0.4)' : '#1E2A45'}`,
                  }}
                  onClick={() => setTargetHostId(h.id)}
                >
                  <span className="text-xs text-white flex-1">{h.name}</span>
                  {targetHostId === h.id && (
                    <span className="text-2xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(96,165,250,0.2)', color: '#60A5FA' }}>selected</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="btn btn-secondary"
                onClick={() => { setMoveOpen(false); setTargetHostId(null) }}
                disabled={moveMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                disabled={!targetHostId || moveMutation.isPending || !vmServer}
                onClick={() => vmServer && targetHostId && moveMutation.mutate({ serverId: vmServer.id, hostId: targetHostId })}
              >
                {moveMutation.isPending
                  ? <><Loader2 size={13} className="animate-spin" /> Moving…</>
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
