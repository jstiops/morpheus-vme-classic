import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listServerGroups, listZones } from '@/api/clouds'
import { listServers } from '@/api/servers'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Search, RefreshCw, Layers } from 'lucide-react'
import { clsx } from 'clsx'

export function ClustersPage() {
  const [search, setSearch] = useState('')

  const { data: groupsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['server-groups'],
    queryFn: listServerGroups,
    staleTime: 60_000,
  })

  const { data: serversData } = useQuery({
    queryKey: ['servers'],
    queryFn: () => listServers({ max: 200 }),
    staleTime: 60_000,
  })

  const { data: zonesData } = useQuery({
    queryKey: ['zones'],
    queryFn: listZones,
    staleTime: 60_000,
  })

  const groups = (groupsData?.serverGroups ?? []).filter(
    (g) => !search || g.name.toLowerCase().includes(search.toLowerCase()),
  )
  const servers = serversData?.servers ?? []
  const zones = zonesData?.zones ?? []

  if (isLoading) return <PageLoader />

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <div>
          <h1 className="text-base font-semibold text-white">Clusters</h1>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {groupsData?.serverGroups?.length ?? 0} clusters
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#566278' }} />
            <input
              className="input text-xs py-1 pl-7 pr-3 h-7"
              style={{ width: 180 }}
              placeholder="Filter clusters…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-ghost p-1.5" onClick={() => refetch()}>
            <RefreshCw size={13} className={clsx(isFetching && 'animate-spin')} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {groups.length === 0 ? (
          <div className="empty-state">
            <Layers size={32} style={{ color: '#566278' }} />
            <p className="text-sm font-medium" style={{ color: '#8B9AB0' }}>No clusters found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Cloud</th>
                <th>Hosts</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const zone = zones.find((z) => z.id === group.zone?.id)
                const hostCount = servers.filter((s) =>
                  group.servers?.includes(s.id),
                ).length

                return (
                  <tr key={group.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <Layers size={13} style={{ color: '#00B388' }} />
                        <span className="font-medium text-white">{group.name}</span>
                      </div>
                    </td>
                    <td style={{ color: '#8B9AB0' }}>
                      {zone?.name ?? group.zone?.name ?? '—'}
                    </td>
                    <td>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: '#1E2A45', color: '#8B9AB0' }}
                      >
                        {hostCount}
                      </span>
                    </td>
                    <td style={{ color: '#566278' }}>
                      {group.description || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div
        className="flex items-center gap-4 px-4 py-1.5 text-2xs"
        style={{ borderTop: '1px solid #1E2A45', color: '#566278', background: '#0D1117' }}
      >
        <span>Showing {groups.length} clusters</span>
        {isFetching && <span style={{ color: '#00B388' }}>Refreshing…</span>}
      </div>
    </div>
  )
}
