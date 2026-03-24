import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from '@tanstack/react-table'
import {
  Play,
  Square,
  RotateCcw,
  PauseCircle,
  Plus,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Terminal,
  Camera,
  Trash2,
  RefreshCw,
  Filter,
} from 'lucide-react'
import {
  listInstances,
  startInstance,
  stopInstance,
  restartInstance,
  suspendInstance,
} from '@/api/instances'
import { StatusBadge } from '@/components/common/StatusDot'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { useUiStore } from '@/store/uiStore'
import { useTreeStore } from '@/store/treeStore'
import type { Instance } from '@/types/morpheus'
import { formatBytes, formatPercent } from '@/utils/format'
import { clsx } from 'clsx'
import toast from 'react-hot-toast'

const col = createColumnHelper<Instance>()

export function VMListPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { globalSearch, openCreateVM, openContextMenu } = useUiStore()
  const { setSelected } = useTreeStore()

  const [sorting, setSorting] = useState<SortingState>([])
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [localSearch, setLocalSearch] = useState('')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 50 }),
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: async ({ ids, action }: { ids: number[]; action: string }) => {
      const fns: Record<string, (id: number) => Promise<unknown>> = {
        start: startInstance,
        stop: stopInstance,
        restart: restartInstance,
        suspend: suspendInstance,
      }
      return Promise.all(ids.map((id) => fns[action](id)))
    },
    onSuccess: (_data, vars) => {
      const labels: Record<string, string> = {
        start: 'Power On',
        stop: 'Power Off',
        restart: 'Restart',
        suspend: 'Suspend',
      }
      toast.success(`${labels[vars.action]} initiated for ${vars.ids.length} VM(s)`)
      setRowSelection({})
      queryClient.invalidateQueries({ queryKey: ['instances'] })
    },
  })

  const instances = data?.instances ?? []

  const filtered = useMemo(() => {
    let rows = instances
    if (statusFilter !== 'all') rows = rows.filter((i) => i.status === statusFilter)
    const q = (localSearch || globalSearch).toLowerCase()
    if (q) {
      rows = rows.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.cloud?.name?.toLowerCase().includes(q) ||
          (i.containers[0]?.ip ?? '').includes(q),
      )
    }
    return rows
  }, [instances, statusFilter, localSearch, globalSearch])

  const columns = useMemo(
    () => [
      col.display({
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
            style={{ accentColor: '#00B388' }}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
            onClick={(e) => e.stopPropagation()}
            style={{ accentColor: '#00B388' }}
          />
        ),
        size: 36,
      }),
      col.accessor('name', {
        header: 'Name',
        cell: (info) => (
          <span
            className="font-medium hover:underline cursor-pointer"
            style={{ color: '#60A5FA' }}
            onClick={() => navigate(`/vms/${info.row.original.id}`)}
          >
            {info.getValue()}
          </span>
        ),
        size: 220,
      }),
      col.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
        size: 110,
      }),
      col.accessor('cloud.name', {
        header: 'Cloud / DC',
        cell: (info) => (
          <span style={{ color: '#8B9AB0' }}>{info.getValue() ?? '—'}</span>
        ),
        size: 140,
      }),
      col.display({
        id: 'ip',
        header: 'IP Address',
        cell: ({ row }) => {
          const ip =
            row.original.containers?.[0]?.ip ??
            row.original.containers?.[0]?.internalIp ??
            '—'
          return <span style={{ color: '#8B9AB0', fontFamily: 'monospace' }}>{ip}</span>
        },
        size: 130,
      }),
      col.display({
        id: 'cpu',
        header: 'CPU',
        cell: ({ row }) => {
          const usage = row.original.stats?.cpuUsage ?? 0
          return (
            <div className="flex items-center gap-2">
              <div className="progress-bar w-16">
                <div
                  className={clsx(
                    'progress-fill',
                    usage > 80 ? 'red' : usage > 60 ? 'yellow' : 'green',
                  )}
                  style={{ width: `${Math.min(usage, 100)}%` }}
                />
              </div>
              <span className="text-2xs" style={{ color: '#8B9AB0' }}>
                {formatPercent(usage)}
              </span>
            </div>
          )
        },
        size: 120,
      }),
      col.display({
        id: 'memory',
        header: 'Memory',
        cell: ({ row }) => {
          const used = row.original.stats?.usedMemory ?? 0
          const max = row.original.stats?.maxMemory ?? row.original.maxMemory ?? 0
          const pct = max > 0 ? (used / max) * 100 : 0
          return (
            <div className="flex items-center gap-2">
              <div className="progress-bar w-16">
                <div
                  className={clsx(
                    'progress-fill',
                    pct > 80 ? 'red' : pct > 60 ? 'yellow' : 'green',
                  )}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <span className="text-2xs" style={{ color: '#8B9AB0' }}>
                {max > 0 ? `${formatBytes(used)} / ${formatBytes(max)}` : '—'}
              </span>
            </div>
          )
        },
        size: 170,
      }),
      col.accessor('dateCreated', {
        header: 'Created',
        cell: (info) => {
          const d = info.getValue()
          return (
            <span style={{ color: '#8B9AB0' }}>
              {d ? new Date(d).toLocaleDateString() : '—'}
            </span>
          )
        },
        size: 100,
      }),
    ],
    [navigate],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableRowSelection: true,
  })

  const selectedIds = Object.keys(rowSelection)
    .filter((k) => rowSelection[k])
    .map((k) => filtered[parseInt(k)]?.id)
    .filter(Boolean) as number[]

  const bulkAction = (action: string) => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one VM first')
      return
    }
    mutation.mutate({ ids: selectedIds, action })
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <div>
          <h1 className="text-base font-semibold text-white">Virtual Machines</h1>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {instances.length} total · {instances.filter((i) => i.status === 'running').length} running
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreateVM}>
          <Plus size={13} />
          New VM
        </button>
      </div>

      {/* Toolbar */}
      <div className="toolbar">
        {/* Power Actions */}
        <button
          className="btn btn-secondary"
          onClick={() => bulkAction('start')}
          disabled={selectedIds.length === 0 || mutation.isPending}
          title="Power On selected"
        >
          <Play size={13} style={{ color: '#00B388' }} />
          Power On
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => bulkAction('stop')}
          disabled={selectedIds.length === 0 || mutation.isPending}
          title="Power Off selected"
        >
          <Square size={13} />
          Power Off
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => bulkAction('restart')}
          disabled={selectedIds.length === 0 || mutation.isPending}
          title="Restart selected"
        >
          <RotateCcw size={13} />
          Restart
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => bulkAction('suspend')}
          disabled={selectedIds.length === 0 || mutation.isPending}
          title="Suspend selected"
        >
          <PauseCircle size={13} />
          Suspend
        </button>

        <div
          className="w-px h-5 mx-1 self-center"
          style={{ background: '#1E2A45' }}
        />

        <button
          className="btn btn-ghost"
          disabled={selectedIds.length !== 1}
          onClick={() => navigate(`/vms/${selectedIds[0]}`)}
          title="Open details"
        >
          <Terminal size={13} />
          Details
        </button>

        <button
          className="btn btn-ghost"
          disabled={selectedIds.length !== 1}
          title="Snapshot"
          onClick={() => navigate(`/vms/${selectedIds[0]}?tab=snapshots`)}
        >
          <Camera size={13} />
          Snapshot
        </button>

        <button
          className="btn btn-ghost btn-danger"
          disabled={selectedIds.length === 0}
          title="Delete"
        >
          <Trash2 size={13} />
        </button>

        <div className="flex-1" />

        {/* Filters */}
        <div className="flex items-center gap-1">
          <Filter size={12} style={{ color: '#566278' }} />
          <select
            className="input text-xs py-1 px-2 h-7"
            style={{ width: 110 }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All States</option>
            <option value="running">Running</option>
            <option value="stopped">Stopped</option>
            <option value="suspended">Suspended</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: '#566278' }}
          />
          <input
            type="text"
            className="input text-xs py-1 pl-7 pr-3 h-7"
            style={{ width: 180 }}
            placeholder="Filter VMs…"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
          />
        </div>

        <button
          className="btn btn-ghost p-1.5"
          onClick={() => refetch()}
          title="Refresh"
        >
          <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
        </button>
      </div>

      {/* Selection Banner */}
      {selectedIds.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-1.5 text-xs"
          style={{ background: 'rgba(0,179,136,0.08)', borderBottom: '1px solid rgba(0,179,136,0.2)' }}
        >
          <span style={{ color: '#00B388' }}>
            {selectedIds.length} VM{selectedIds.length > 1 ? 's' : ''} selected
          </span>
          <button
            className="text-xs"
            style={{ color: '#566278' }}
            onClick={() => setRowSelection({})}
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="text-4xl">💻</div>
            <p className="text-sm font-medium" style={{ color: '#8B9AB0' }}>
              No virtual machines found
            </p>
            <p className="text-xs">Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() }}
                      className={clsx(header.column.getCanSort() && 'sortable')}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {header.column.getCanSort() && (
                          <span style={{ color: '#3A4560' }}>
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp size={11} />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown size={11} />
                            ) : (
                              <ChevronsUpDown size={11} />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={clsx(row.getIsSelected() && 'selected')}
                  onDoubleClick={() => {
                    setSelected(`vm-${row.original.id}`)
                    navigate(`/vms/${row.original.id}`)
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault()
                    openContextMenu(
                      e.clientX,
                      e.clientY,
                      row.original.id,
                      row.original.name,
                    )
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Status Bar */}
      <div
        className="flex items-center gap-4 px-4 py-1.5 text-2xs"
        style={{
          borderTop: '1px solid #1E2A45',
          color: '#566278',
          background: '#0D1117',
        }}
      >
        <span>
          Showing {filtered.length} of {instances.length} VMs
        </span>
        {isFetching && <span style={{ color: '#00B388' }}>Refreshing…</span>}
      </div>
    </div>
  )
}
