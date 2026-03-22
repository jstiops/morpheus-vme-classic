import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2, RotateCcw, Plus } from 'lucide-react'
import { getInstanceSnapshots, createSnapshot, deleteSnapshot, revertSnapshot } from '@/api/instances'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Modal } from '@/components/common/Modal'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Props {
  instanceId: number
}

export function SnapshotsTab({ instanceId }: Props) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDesc, setSnapshotDesc] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['instance-snapshots', instanceId],
    queryFn: () => getInstanceSnapshots(instanceId),
    staleTime: 30_000,
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createSnapshot(instanceId, { name: snapshotName, description: snapshotDesc }),
    onSuccess: () => {
      toast.success('Snapshot created')
      setCreateOpen(false)
      setSnapshotName('')
      setSnapshotDesc('')
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (snapshotId: number) => deleteSnapshot(instanceId, snapshotId),
    onSuccess: () => {
      toast.success('Snapshot deleted')
      setConfirmDelete(null)
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
    },
  })

  const revertMutation = useMutation({
    mutationFn: (snapshotId: number) => revertSnapshot(instanceId, snapshotId),
    onSuccess: () => {
      toast.success('Revert initiated')
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['instance', instanceId] })
    },
  })

  if (isLoading) return <PageLoader />

  const snapshots = data?.snapshots ?? []

  return (
    <div className="max-w-3xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Snapshots</h3>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={13} />
          Take Snapshot
        </button>
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
          {snapshots.map((snap) => (
            <div
              key={snap.id}
              className={clsx(
                'flex items-center gap-3 p-3 rounded-lg',
                snap.currentlyActive &&
                  'ring-1 ring-hpe-green/30',
              )}
              style={{
                background: '#141C2E',
                border: `1px solid ${snap.currentlyActive ? 'rgba(0,179,136,0.3)' : '#1E2A45'}`,
              }}
            >
              <Camera
                size={16}
                style={{ color: snap.currentlyActive ? '#00B388' : '#566278' }}
                className="shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white truncate">
                    {snap.name}
                  </span>
                  {snap.currentlyActive && (
                    <span
                      className="text-2xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(0,179,136,0.15)', color: '#00B388' }}
                    >
                      Active
                    </span>
                  )}
                </div>
                {snap.description && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#566278' }}>
                    {snap.description}
                  </p>
                )}
                <div className="text-2xs mt-1" style={{ color: '#566278' }}>
                  Created: {snap.dateCreated
                    ? (() => {
                        try {
                          return format(new Date(snap.dateCreated), 'MMM d, yyyy HH:mm')
                        } catch {
                          return snap.dateCreated
                        }
                      })()
                    : '—'
                  }
                  {snap.status && (
                    <span className="ml-2 capitalize">{snap.status}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="btn btn-ghost py-1 px-2 text-xs"
                  onClick={() => revertMutation.mutate(snap.id)}
                  disabled={revertMutation.isPending}
                  title="Revert to this snapshot"
                >
                  <RotateCcw size={12} />
                  Revert
                </button>
                <button
                  className="btn btn-ghost py-1 px-2"
                  onClick={() => setConfirmDelete(snap.id)}
                  title="Delete snapshot"
                >
                  <Trash2 size={12} style={{ color: '#EF4444' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Snapshot Modal */}
      {createOpen && (
        <Modal
          title="Take Snapshot"
          onClose={() => setCreateOpen(false)}
          width={440}
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={() => createMutation.mutate()}
                disabled={!snapshotName || createMutation.isPending}
              >
                {createMutation.isPending ? 'Creating…' : 'Take Snapshot'}
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
              />
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete !== null && (
        <Modal
          title="Delete Snapshot"
          onClose={() => setConfirmDelete(null)}
          width={400}
          footer={
            <>
              <button
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => deleteMutation.mutate(confirmDelete)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete Snapshot'}
              </button>
            </>
          }
        >
          <p className="text-sm" style={{ color: '#8B9AB0' }}>
            This action cannot be undone. The snapshot will be permanently deleted.
          </p>
        </Modal>
      )}
    </div>
  )
}
