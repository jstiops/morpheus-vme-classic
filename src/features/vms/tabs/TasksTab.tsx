import { useQuery } from '@tanstack/react-query'
import { getInstanceHistory } from '@/api/instances'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { clsx } from 'clsx'

interface Props {
  instanceId: number
}

function statusIcon(status: string) {
  const s = status.toLowerCase()
  if (s === 'complete' || s === 'success') return <CheckCircle size={14} style={{ color: '#00B388' }} />
  if (s === 'failed' || s === 'error') return <XCircle size={14} style={{ color: '#EF4444' }} />
  if (s === 'warning') return <AlertCircle size={14} style={{ color: '#F59E0B' }} />
  if (s === 'running' || s === 'in-progress') return <RefreshCw size={14} className="animate-spin" style={{ color: '#60A5FA' }} />
  return <Clock size={14} style={{ color: '#566278' }} />
}

export function TasksTab({ instanceId }: Props) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['instance-history', instanceId],
    queryFn: () => getInstanceHistory(instanceId),
    staleTime: 20_000,
    refetchInterval: 30_000,
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
        <div
          className="rounded-lg overflow-hidden"
          style={{ border: '1px solid #1E2A45' }}
        >
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
                try {
                  ago = formatDistanceToNow(new Date(ts), { addSuffix: true })
                } catch {
                  ago = ts
                }
                const durationMs =
                  proc.duration ??
                  (proc.startDate && proc.endDate
                    ? new Date(proc.endDate).getTime() -
                      new Date(proc.startDate).getTime()
                    : null)

                return (
                  <tr key={proc.id}>
                    <td className="text-center">
                      {statusIcon(proc.status)}
                    </td>
                    <td>
                      <div className="font-medium text-white">
                        {proc.displayName ??
                          proc.processType?.name ??
                          proc.description ??
                          'Unknown'}
                      </div>
                      {proc.reason && (
                        <div className="text-2xs mt-0.5 truncate" style={{ color: '#566278' }}>
                          {proc.reason}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        className={clsx(
                          'text-xs',
                          proc.status.toLowerCase() === 'complete' ||
                            proc.status.toLowerCase() === 'success'
                            ? 'text-green-400'
                            : proc.status.toLowerCase() === 'failed'
                              ? 'text-red-400'
                              : 'text-gray-400',
                        )}
                      >
                        {proc.status}
                        {proc.percent != null && proc.percent < 100 && (
                          <span className="ml-1">({proc.percent}%)</span>
                        )}
                      </span>
                    </td>
                    <td style={{ color: '#8B9AB0' }}>
                      {durationMs != null
                        ? durationMs < 1000
                          ? `${durationMs}ms`
                          : `${(durationMs / 1000).toFixed(1)}s`
                        : '—'}
                    </td>
                    <td style={{ color: '#8B9AB0' }}>
                      {proc.createdBy?.username ?? proc.createdBy?.displayName ?? '—'}
                    </td>
                    <td style={{ color: '#566278' }} title={ts}>
                      {ago}
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
