import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
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
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  RefreshCw,
  Filter,
} from 'lucide-react'
import { listInstances } from '@/api/instances'
import { listClusters } from '@/api/clouds'
import { StatusBadge } from '@/components/common/StatusDot'
import { PageLoader } from '@/components/common/LoadingSpinner'
import type { Instance } from '@/types/morpheus'
import { formatBytes, formatPercent } from '@/utils/format'
import { clsx } from 'clsx'

const col = createColumnHelper<Instance>()

export function VMListPage() {
  const navigate = useNavigate()

  const [sorting, setSorting] = useState<SortingState>([])
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [localSearch, setLocalSearch] = useState('')

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 50 }),
    staleTime: 30_000,
  })

  const { data: clustersData } = useQuery({
    queryKey: ['clusters'],
    queryFn: () => listClusters(),
    staleTime: 60_000,
    retry: 0,
  })

  // Map from host server ID → cluster name
  const serverToCluster = useMemo(() => {
    const map = new Map<number, string>()
    for (const cluster of clustersData?.clusters ?? []) {
      for (const srv of cluster.servers ?? []) {
        map.set(srv.id, cluster.name)
      }
    }
    return map
  }, [clustersData])

  const instances = data?.instances ?? []

  const filtered = useMemo(() => {
    let rows = instances
    if (statusFilter !== 'all') rows = rows.filter((i) => i.status === statusFilter)
    const q = localSearch.toLowerCase()
    if (q) {
      rows = rows.filter((i) => {
        const hostName = i.containers?.[0]?.server?.name ?? ''
        const clusterName = serverToCluster.get(i.containers?.[0]?.server?.id ?? -1) ?? ''
        return (
          i.name.toLowerCase().includes(q) ||
          i.status.toLowerCase().includes(q) ||
          hostName.toLowerCase().includes(q) ||
          clusterName.toLowerCase().includes(q)
        )
      })
    }
    return rows
  }, [instances, statusFilter, localSearch, serverToCluster])

  const columns = useMemo(
    () => [
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
        size: 240,
      }),
      col.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusBadge status={info.getValue()} />,
        size: 120,
      }),
      col.display({
        id: 'host',
        header: 'Host',
        cell: ({ row }) => {
          const hostName = row.original.containers?.[0]?.server?.name
          return (
            <span style={{ color: '#8B9AB0' }}>{hostName ?? '—'}</span>
          )
        },
        size: 160,
      }),
      col.display({
        id: 'cluster',
        header: 'Cluster',
        cell: ({ row }) => {
          const serverId = row.original.containers?.[0]?.server?.id
          const clusterName = serverId != null ? serverToCluster.get(serverId) : undefined
          return (
            <span style={{ color: '#8B9AB0' }}>{clusterName ?? '—'}</span>
          )
        },
        size: 160,
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
    ],
    [navigate, serverToCluster],
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

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
      </div>

      {/* Toolbar */}
      <div className="toolbar">
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
            style={{ width: 220 }}
            placeholder="Filter by name, status, host, cluster…"
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
                  className="cursor-pointer"
                  onClick={() => navigate(`/vms/${row.original.id}`)}
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
