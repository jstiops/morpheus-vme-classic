import { useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Play,
  Square,
  RotateCcw,
  PauseCircle,
  Terminal,
  Camera,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { getInstance, startInstance, stopInstance, restartInstance, suspendInstance } from '@/api/instances'
import { StatusBadge } from '@/components/common/StatusDot'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { SummaryTab } from './tabs/SummaryTab'
import { MonitorTab } from './tabs/MonitorTab'
import { SnapshotsTab } from './tabs/SnapshotsTab'
import { TasksTab } from './tabs/TasksTab'
import toast from 'react-hot-toast'
import { clsx } from 'clsx'

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'monitor', label: 'Monitor' },
  { id: 'configure', label: 'Configure' },
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

  const mutation = useMutation({
    mutationFn: async (action: string) => {
      const fns: Record<string, (id: number) => Promise<unknown>> = {
        start: startInstance,
        stop: stopInstance,
        restart: restartInstance,
        suspend: suspendInstance,
      }
      return fns[action](instanceId)
    },
    onSuccess: (_data, action) => {
      const labels: Record<string, string> = {
        start: 'Power On',
        stop: 'Power Off',
        restart: 'Restart',
        suspend: 'Suspend',
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
        </div>

        {/* Power Controls */}
        <div className="flex items-center gap-1">
          <button
            className="btn btn-secondary py-1.5 px-3"
            disabled={isRunning || isMutating}
            onClick={() => mutation.mutate('start')}
            title="Power On"
          >
            <Play size={13} style={{ color: '#00B388' }} />
            Power On
          </button>
          <button
            className="btn btn-secondary py-1.5 px-3"
            disabled={isStopped || isMutating}
            onClick={() => mutation.mutate('stop')}
            title="Power Off"
          >
            <Square size={13} />
            Power Off
          </button>
          <button
            className="btn btn-secondary py-1.5 px-2"
            disabled={isStopped || isMutating}
            onClick={() => mutation.mutate('restart')}
            title="Restart"
          >
            <RotateCcw size={13} />
          </button>
          <button
            className="btn btn-secondary py-1.5 px-2"
            disabled={isStopped || isMutating}
            onClick={() => mutation.mutate('suspend')}
            title="Suspend"
          >
            <PauseCircle size={13} />
          </button>

          <div className="w-px h-5 mx-1" style={{ background: '#1E2A45' }} />

          <button
            className="btn btn-secondary py-1.5 px-2"
            onClick={() => setTab('snapshots')}
            title="Snapshots"
          >
            <Camera size={13} />
          </button>

          <button
            className="btn btn-secondary py-1.5 px-2"
            onClick={() => {
              const url = `/api/instances/${instanceId}/console`
              window.open(url, '_blank', 'noopener')
            }}
            title="Open Console"
          >
            <Terminal size={13} />
            <ExternalLink size={10} style={{ marginLeft: -2 }} />
          </button>

          <button
            className="btn btn-ghost py-1.5 px-2"
            onClick={() => refetch()}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
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
        {activeTab === 'summary' && <SummaryTab instance={instance} />}
        {activeTab === 'monitor' && <MonitorTab instanceId={instanceId} />}
        {activeTab === 'configure' && (
          <ConfigureTab instance={instance} />
        )}
        {activeTab === 'snapshots' && <SnapshotsTab instanceId={instanceId} />}
        {activeTab === 'tasks' && <TasksTab instanceId={instanceId} />}
      </div>
    </div>
  )
}

function ConfigureTab({ instance }: { instance: ReturnType<typeof getInstance> extends Promise<infer T> ? T : never }) {
  return (
    <div className="grid grid-cols-2 gap-4 max-w-3xl">
      <div className="card col-span-2">
        <div className="card-title">General Configuration</div>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ['Instance ID', instance.id],
            ['Name', instance.name],
            ['Description', instance.description || '—'],
            ['Cloud', instance.cloud?.name],
            ['Plan', instance.plan?.name || '—'],
            ['Layout', instance.layout?.name || '—'],
            ['Instance Type', instance.instanceType?.name || '—'],
            ['Created By', instance.createdBy?.username || '—'],
            ['Owner', instance.owner?.username || '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="flex gap-2">
              <dt style={{ color: '#566278', minWidth: 110, fontSize: 12 }}>{label}:</dt>
              <dd style={{ color: '#D4D9E3', fontSize: 12 }}>{String(value ?? '—')}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card">
        <div className="card-title">Resources</div>
        <dl className="grid grid-cols-1 gap-y-3 text-sm">
          {[
            ['vCPUs', `${instance.maxCores ?? instance.containers?.[0]?.maxCores ?? '—'}`],
            ['Memory', instance.maxMemory ? `${(instance.maxMemory / (1024 ** 3)).toFixed(1)} GB` : '—'],
            ['Storage', instance.maxStorage ? `${(instance.maxStorage / (1024 ** 3)).toFixed(0)} GB` : '—'],
          ].map(([label, value]) => (
            <div key={label as string} className="flex gap-2">
              <dt style={{ color: '#566278', minWidth: 80, fontSize: 12 }}>{label}:</dt>
              <dd style={{ color: '#D4D9E3', fontSize: 12 }}>{String(value)}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card">
        <div className="card-title">Tags</div>
        {instance.tags && instance.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {instance.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: '#1E2A45', color: '#8B9AB0' }}
              >
                {tag.name}{tag.value ? `: ${tag.value}` : ''}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs" style={{ color: '#566278' }}>No tags</p>
        )}
      </div>
    </div>
  )
}
