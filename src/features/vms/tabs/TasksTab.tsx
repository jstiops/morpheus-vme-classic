import { useQuery } from '@tanstack/react-query'
import { getServerHistory } from '@/api/servers'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  serverId: number
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

export function TasksTab({ serverId }: Props) {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['server-history', serverId],
    queryFn: () => getServerHistory(serverId),
    staleTime: 0,
    refetchInterval: (query) => {
      const processes = query.state.data?.processes ?? []
      const hasRunning = processes.some((p) => p.status === 'running' || p.status === 'in-progress')
      return hasRunning ? 3_000 : 10_000
    },
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
                    <div className="text-2xs mt-0.5 truncate" style={{ color: '#3A4560' }}>
                      {proc.reason}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
