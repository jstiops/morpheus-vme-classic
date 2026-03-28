import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listServers } from '@/api/servers'
import { StatusBadge } from '@/components/common/StatusDot'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { formatBytes, formatPercent } from '@/utils/format'
import { Search, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'

export function HostsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['servers', 'hypervisors'],
    queryFn: () => listServers({ max: 100, vmHypervisor: true }),
    staleTime: 60_000,
  })

  const allHypervisors = (data?.servers ?? []).filter(
    (s) => s.osMorpheusType !== 'esxi' && s.osType !== 'esxi',
  )

  const servers = allHypervisors.filter(
    (s) =>
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.zone?.name ?? s.cloud?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  if (isLoading) return <PageLoader />

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <div>
          <h1 className="text-base font-semibold text-white">Hosts</h1>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {allHypervisors.length} hypervisors
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#566278' }} />
            <input
              className="input text-xs py-1 pl-7 pr-3 h-7"
              style={{ width: 180 }}
              placeholder="Filter hosts…"
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
        {servers.length === 0 ? (
          <div className="empty-state">
            <div className="text-4xl">🖥️</div>
            <p className="text-sm font-medium" style={{ color: '#8B9AB0' }}>No hosts found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Cloud</th>
                <th>IP Address</th>
                <th>CPU Usage</th>
                <th>Memory</th>
                <th>VMs</th>
                <th>OS</th>
                <th>Agent Version</th>
              </tr>
            </thead>
            <tbody>
              {servers.map((server) => {
                const cpuPct = server.stats?.cpuUsage ?? 0
                const memUsed = server.stats?.usedMemory ?? server.usedMemory ?? 0
                const memMax = server.stats?.maxMemory ?? server.maxMemory ?? 0
                const memPct = memMax > 0 ? (memUsed / memMax) * 100 : 0

                return (
                  <tr key={server.id} className="cursor-pointer" onClick={() => navigate(`/hosts/${server.id}`)}>

                    <td>
                      <span className="font-medium text-white">{server.name}</span>
                      {server.hostname && server.hostname !== server.name && (
                        <div className="text-2xs font-mono" style={{ color: '#566278' }}>
                          {server.hostname}
                        </div>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={server.status} />
                    </td>
                    <td style={{ color: '#8B9AB0' }}>{server.zone?.name ?? server.cloud?.name ?? '—'}</td>
                    <td>
                      <span className="font-mono text-xs" style={{ color: '#8B9AB0' }}>
                        {server.internalIp ?? server.externalIp ?? '—'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="progress-bar w-16">
                          <div
                            className={clsx('progress-fill', cpuPct > 80 ? 'red' : cpuPct > 60 ? 'yellow' : 'green')}
                            style={{ width: `${Math.min(cpuPct, 100)}%` }}
                          />
                        </div>
                        <span className="text-2xs" style={{ color: '#8B9AB0' }}>
                          {formatPercent(cpuPct)}
                        </span>
                      </div>
                    </td>
                    <td>
                      {memMax > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="progress-bar w-16">
                            <div
                              className={clsx('progress-fill', memPct > 80 ? 'red' : memPct > 60 ? 'yellow' : 'green')}
                              style={{ width: `${Math.min(memPct, 100)}%` }}
                            />
                          </div>
                          <span className="text-2xs" style={{ color: '#8B9AB0' }}>
                            {formatBytes(memUsed)} / {formatBytes(memMax)}
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: '#566278' }}>—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ background: '#1E2A45', color: '#8B9AB0' }}
                      >
                        {server.containers?.length ?? 0}
                      </span>
                    </td>
                    <td style={{ color: '#566278' }}>
                      {server.osMorpheusType ?? server.osType ?? '—'}
                    </td>
                    <td style={{ color: '#566278' }}>
                      {server.agentVersion ?? '—'}
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
        <span>Showing {servers.length} of {allHypervisors.length} hosts</span>
        {isFetching && <span style={{ color: '#00B388' }}>Refreshing…</span>}
      </div>
    </div>
  )
}
