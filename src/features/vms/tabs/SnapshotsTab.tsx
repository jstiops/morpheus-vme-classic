import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, Trash2, RotateCcw, Plus, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react'
import {
  getInstanceSnapshots,
  createSnapshot,
  deleteSnapshot,
  revertSnapshot,
  listProcessesByInstance,
} from '@/api/instances'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Modal } from '@/components/common/Modal'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Props {
  instanceId: number
}

interface PendingOp {
  label: string
  startedAt: number
}

const BUSY_STATUSES = ['queued', 'creating', 'in-progress', 'running', 'deleting']
const OP_TIMEOUT_MS = 120_000 // 2 min hard stop

function isBusy(status?: string) {
  return BUSY_STATUSES.includes((status ?? '').toLowerCase())
}

export function SnapshotsTab({ instanceId }: Props) {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [snapshotName, setSnapshotName] = useState('')
  const [snapshotDesc, setSnapshotDesc] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null)
  const [pendingOp, setPendingOp] = useState<PendingOp | null>(null)
  const [justDone, setJustDone] = useState(false)

  // ── Snapshot list ──────────────────────────────────────────────────────────
  const { data: snapData, isLoading, refetch: refetchSnaps } = useQuery({
    queryKey: ['instance-snapshots', instanceId],
    queryFn: () => getInstanceSnapshots(instanceId),
    staleTime: 10_000,
    refetchInterval: pendingOp ? 4_000 : false,
  })

  // ── Process monitor — only active while an op is pending ──────────────────
  const { data: processData } = useQuery({
    queryKey: ['instance-processes', instanceId],
    queryFn: () => listProcessesByInstance(instanceId),
    enabled: !!pendingOp,
    staleTime: 0,
    refetchInterval: pendingOp ? 3_000 : false,
  })

  const runningProcess = pendingOp
    ? (processData?.processes ?? []).find(
        (p) => p.status === 'running' || p.status === 'in-progress',
      )
    : undefined

  // ── Detect completion ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingOp) return

    const snaps = snapData?.snapshots ?? []
    const snapshotsBusy = snaps.some((s) => isBusy(s.status))
    const processDone = processData !== undefined && !runningProcess
    const timedOut = Date.now() - pendingOp.startedAt > OP_TIMEOUT_MS

    if ((processDone && !snapshotsBusy) || timedOut) {
      setPendingOp(null)
      refetchSnaps()
      setJustDone(true)
      setTimeout(() => setJustDone(false), 2_500)
      // Invalidate process cache so it stops polling
      queryClient.removeQueries({ queryKey: ['instance-processes', instanceId] })
    }
  }, [processData, snapData, runningProcess, pendingOp, instanceId, queryClient, refetchSnaps])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: () =>
      createSnapshot(instanceId, { name: snapshotName, description: snapshotDesc }),
    onSuccess: () => {
      setCreateOpen(false)
      setSnapshotName('')
      setSnapshotDesc('')
      setPendingOp({ label: `Creating snapshot "${snapshotName}"`, startedAt: Date.now() })
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
    },
    onError: () => toast.error('Failed to create snapshot'),
  })

  const deleteMutation = useMutation({
    mutationFn: (snapshotId: number) => deleteSnapshot(instanceId, snapshotId),
    onSuccess: (_data, _snapshotId) => {
      const name = confirmDelete?.name ?? 'snapshot'
      setConfirmDelete(null)
      setPendingOp({ label: `Deleting snapshot "${name}"`, startedAt: Date.now() })
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
    },
    onError: () => toast.error('Failed to delete snapshot'),
  })

  const revertMutation = useMutation({
    mutationFn: (snapshotId: number) => revertSnapshot(instanceId, snapshotId),
    onSuccess: (_data, snapshotId) => {
      const name = snapData?.snapshots.find((s) => s.id === snapshotId)?.name ?? 'snapshot'
      setPendingOp({ label: `Reverting to "${name}"`, startedAt: Date.now() })
      queryClient.invalidateQueries({ queryKey: ['instance-snapshots', instanceId] })
      queryClient.invalidateQueries({ queryKey: ['instance', instanceId] })
    },
    onError: () => toast.error('Failed to revert snapshot'),
  })

  if (isLoading) return <PageLoader />

  const snapshots = snapData?.snapshots ?? []
  const isMutating = createMutation.isPending || deleteMutation.isPending || revertMutation.isPending

  const progressLabel = runningProcess
    ? [runningProcess.displayName, runningProcess.processType?.name]
        .filter(Boolean)
        .join(' – ') || pendingOp?.label
    : pendingOp?.label

  const progressPct = runningProcess?.percent ?? null

  return (
    <div className="max-w-3xl space-y-4">
      {/* ── Operation progress banner ── */}
      {pendingOp && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.3)' }}
        >
          <Loader2 size={16} className="animate-spin shrink-0" style={{ color: '#60A5FA' }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium" style={{ color: '#60A5FA' }}>
              {progressLabel}
            </p>
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
      )}

      {/* ── Done flash ── */}
      {justDone && !pendingOp && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ background: 'rgba(0,179,136,0.1)', border: '1px solid rgba(0,179,136,0.3)' }}
        >
          <CheckCircle2 size={16} style={{ color: '#00B388' }} />
          <p className="text-xs font-medium" style={{ color: '#00B388' }}>Operation completed</p>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Snapshots</h3>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost py-1 px-2"
            onClick={() => refetchSnaps()}
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => setCreateOpen(true)}
            disabled={!!pendingOp || isMutating}
          >
            <Plus size={13} />
            Take Snapshot
          </button>
        </div>
      </div>

      {/* ── Snapshots list ── */}
      {snapshots.length === 0 ? (
        <div className="empty-state">
          <Camera size={32} style={{ color: '#566278' }} />
          <p className="text-sm" style={{ color: '#8B9AB0' }}>No snapshots</p>
          <p className="text-xs">Take a snapshot to save the current VM state</p>
          <button
            className="btn btn-secondary"
            onClick={() => setCreateOpen(true)}
            disabled={!!pendingOp}
          >
            <Plus size={13} />
            Take Snapshot
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {snapshots.map((snap) => {
            const busy = isBusy(snap.status)

            return (
              <div
                key={snap.id}
                className={clsx(
                  'flex items-center gap-3 p-3 rounded-lg',
                  (pendingOp || busy) && 'opacity-60',
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
                    disabled={!!pendingOp || isMutating}
                    title="Revert to this snapshot"
                  >
                    <RotateCcw size={12} />
                    Revert
                  </button>
                  <button
                    className="btn btn-ghost py-1 px-2"
                    onClick={() => setConfirmDelete({ id: snap.id, name: snap.name })}
                    disabled={!!pendingOp || isMutating}
                    title="Delete snapshot"
                  >
                    <Trash2 size={12} style={{ color: '#EF4444' }} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Snapshot Modal ── */}
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
                  <><Loader2 size={13} className="animate-spin" /> Queuing…</>
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

      {/* ── Confirm Delete Modal ── */}
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
                  <><Loader2 size={13} className="animate-spin" /> Deleting…</>
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
