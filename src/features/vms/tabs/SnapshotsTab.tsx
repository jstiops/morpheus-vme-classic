import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2, RotateCcw, Plus, RefreshCw, Loader2 } from 'lucide-react'
import { getInstanceSnapshots, createSnapshot, deleteSnapshot, revertSnapshot } from '@/api/instances'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Modal } from '@/components/common/Modal'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Props {
  instanceId: number
}

const BUSY_STATUSES = ['queued', 'creating', 'in-progress', 'running', 'deleting']

function isBusy(status?: string) {
  return BUSY_STATUSES.includes((status ?? '').toLowerCase())
}

export function SnapshotsTab({ instanceId }: Props) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDesc, setSnapshotDesc] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null)
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set())

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['instance-snapshots', instanceId],
    queryFn: () => getInstanceSnapshots(instanceId),
    staleTime: 10_000,
    // Poll every 4s if any snapshot is in a busy state
    refetchInterval: (query) => {
      const snaps = query.state.data?.snapshots ?? []
      return snaps.some((s) => isBusy(s.status)) ? 4_000 : false
    },
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createSnapshot(instanceId, { name: snapshotName, description: snapshotDesc }),
    onSuccess: () => {
      setCreateOpen(false)
      setSnapshotName('')
      setSnapshotDesc('')
      toast.success('Snapshot creation queued')
      // Poll every 4s to pick up the new snapshot as it progresses
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
    },
    onError: () => {
      toast.error('Failed to create snapshot')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (snapshotId: number) => {
      setDeletingIds((prev) => new Set(prev).add(snapshotId))
      return deleteSnapshot(instanceId, snapshotId)
    },
    onSuccess: (_data, snapshotId) => {
      toast.success('Snapshot deleted')
      setConfirmDelete(null)
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(snapshotId)
        return next
      })
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
    },
    onError: (_err, snapshotId) => {
      toast.error('Failed to delete snapshot')
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(snapshotId)
        return next
      })
    },
  })

  const revertMutation = useMutation({
    mutationFn: (snapshotId: number) => revertSnapshot(instanceId, snapshotId),
    onSuccess: () => {
      toast.success('Revert initiated')
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['instance', instanceId] })
    },
    onError: () => {
      toast.error('Failed to revert snapshot')
    },
  })

  if (isLoading) return <PageLoader />

  const snapshots = data?.snapshots ?? []
  const anyBusy = snapshots.some((s) => isBusy(s.status))

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Snapshots</h3>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
            {anyBusy && (
              <span className="ml-2" style={{ color: '#60A5FA' }}>
                — operation in progress
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost py-1 px-2" onClick={() => refetch()} title="Refresh">
            <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
          </button>
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <Plus size={13} />
            Take Snapshot
          </button>
        </div>
      </div>

      {/* Snapshots List */}
      {snapshots.length === 0 ? (
        <div className="empty-state">
          <Camera size={32} style={{ color: '#566278' }} />
          <p className="text-sm" style={{ color: '#8B9AB0' }}>No snapshots</p>
          <p className="text-xs">Take a snapshot to save the current VM state</p>
          <button className="btn btn-secondary" onClick={() => setCreateOpen(true)}>
            <Plus size={13} />
            Take Snapshot
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => {
            const busy = isBusy(snap.status)
            const deleting = deletingIds.has(snap.id)

            return (
              <div
                key={snap.id}
                className={clsx('flex items-center gap-3 p-3 rounded-lg', deleting && 'opacity-50')}
                style={{
                  background: '#141C2E',
                  border: `1px solid ${snap.currentlyActive ? 'rgba(0,179,136,0.3)' : '#1E2A45'}`,
                }}
              >
                {/* Icon — spinner when busy */}
                {busy || deleting ? (
                  <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#60A5FA' }} />
                ) : (
                  <Camera
                    size={16}
                    style={{ color: snap.currentlyActive ? '#00B388' : '#566278' }}
                    className="shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-white truncate">{snap.name}</span>
                    {snap.currentlyActive && (
                      <span
                        className="text-2xs px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(0,179,136,0.15)', color: '#00B388' }}
                      >
                        Active
                      </span>
                    )}
                    {snap.status && (
                      <span
                        className="text-2xs px-1.5 py-0.5 rounded capitalize"
                        style={{
                          background: busy ? 'rgba(96,165,250,0.15)' : 'rgba(86,98,120,0.2)',
                          color: busy ? '#60A5FA' : '#566278',
                        }}
                      >
                        {snap.status}
                      </span>
                    )}
                  </div>
                  {snap.description && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#566278' }}>
                      {snap.description}
                    </p>
                  )}
                  <div className="text-2xs mt-1" style={{ color: '#566278' }}>
                    {snap.dateCreated
                      ? (() => {
                          try {
                            return `Created: ${format(new Date(snap.dateCreated), 'MMM d, yyyy HH:mm')}`
                          } catch {
                            return `Created: ${snap.dateCreated}`
                          }
                        })()
                      : '—'}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="btn btn-ghost py-1 px-2 text-xs"
                    onClick={() => revertMutation.mutate(snap.id)}
                    disabled={busy || deleting || revertMutation.isPending}
                    title="Revert to this snapshot"
                  >
                    {revertMutation.isPending ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <RotateCcw size={12} />
                    )}
                    Revert
                  </button>
                  <button
                    className="btn btn-ghost py-1 px-2"
                    onClick={() => setConfirmDelete({ id: snap.id, name: snap.name })}
                    disabled={busy || deleting}
                    title="Delete snapshot"
                  >
                    {deleting ? (
                      <Loader2 size={12} className="animate-spin" style={{ color: '#EF4444' }} />
                    ) : (
                      <Trash2 size={12} style={{ color: '#EF4444' }} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Snapshot Modal */}
      {createOpen && (
        <Modal
          title="Take Snapshot"
          onClose={() => !createMutation.isPending && setCreateOpen(false)}
          width={440}
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setCreateOpen(false)}
                disabled={createMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => createMutation.mutate()}
                disabled={!snapshotName || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Creating…
                  </>
                ) : 'Take Snapshot'}
              </button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
                Snapshot Name <span style={{ color: '#EF4444' }}>*</span>
              </label>
              <input
                className="input"
                placeholder="e.g., pre-upgrade-snapshot"
                value={snapshotName}
                onChange={(e) => setSnapshotName(e.target.value)}
                autoFocus
                disabled={createMutation.isPending}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: '#8B9AB0' }}>
                Description
              </label>
              <textarea
                className="input resize-none"
                rows={3}
                placeholder="Optional description…"
                value={snapshotDesc}
                onChange={(e) => setSnapshotDesc(e.target.value)}
                disabled={createMutation.isPending}
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete !== null && (
        <Modal
          title="Delete Snapshot"
          onClose={() => !deleteMutation.isPending && setConfirmDelete(null)}
          width={400}
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => deleteMutation.mutate(confirmDelete.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Deleting…
                  </>
                ) : 'Delete Snapshot'}
              </button>
            </>
          }
        >
          <p className="text-sm" style={{ color: '#8B9AB0' }}>
            Delete snapshot <span className="text-white font-medium">"{confirmDelete.name}"</span>? This cannot be undone.
          </p>
        </Modal>
      )}
    </div>
  )
}
