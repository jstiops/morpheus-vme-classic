import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { listNetworks } from '@/api/clouds'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { Search, RefreshCw, Network, CheckCircle, XCircle } from 'lucide-react'
import { clsx } from 'clsx'

export function NetworksPage() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['networks'],
    queryFn: () => listNetworks({ max: 50 }),
    staleTime: 60_000,
  })

  const networks = (data?.networks ?? []).filter(
    (n) =>
      !search ||
      n.name.toLowerCase().includes(search.toLowerCase()) ||
      n.cidr?.includes(search) ||
      n.zone?.name?.toLowerCase().includes(search.toLowerCase()),
  )

  if (isLoading) return <PageLoader />

  return (
    <div className="flex flex-col h-full">
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <div>
          <h1 className="text-base font-semibold text-white">Networks</h1>
          <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
            {data?.networks?.length ?? 0} networks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#566278' }} />
            <input
              className="input text-xs py-1 pl-7 pr-3 h-7"
              style={{ width: 180 }}
              placeholder="Filter networks…"
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
        {networks.length === 0 ? (
          <div className="empty-state">
            <Network size={32} style={{ color: '#566278' }} />
            <p className="text-sm font-medium" style={{ color: '#8B9AB0' }}>No networks found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>CIDR</th>
                <th>Gateway</th>
                <th>Cloud</th>
                <th>Type</th>
                <th>DHCP</th>
                <th>VLAN</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {networks.map((net) => (
                <tr key={net.id} className="cursor-pointer" onClick={() => navigate(`/networks/${net.id}`)}>
                  <td>
                    <div className="flex items-center gap-2">
                      <Network size={12} style={{ color: '#60A5FA' }} />
                      <span className="font-medium text-white">{net.name}</span>
                    </div>
                    {net.description && (
                      <div className="text-2xs" style={{ color: '#566278' }}>{net.description}</div>
                    )}
                  </td>
                  <td>
                    <span className="font-mono text-xs" style={{ color: '#8B9AB0' }}>
                      {net.cidr ?? '—'}
                    </span>
                  </td>
                  <td>
                    <span className="font-mono text-xs" style={{ color: '#8B9AB0' }}>
                      {net.gateway ?? '—'}
                    </span>
                  </td>
                  <td style={{ color: '#8B9AB0' }}>{net.zone?.name ?? '—'}</td>
                  <td style={{ color: '#566278' }}>{net.type?.name ?? '—'}</td>
                  <td>
                    {net.dhcpServer ? (
                      <CheckCircle size={13} style={{ color: '#00B388' }} />
                    ) : (
                      <XCircle size={13} style={{ color: '#566278' }} />
                    )}
                  </td>
                  <td style={{ color: '#566278' }}>
                    {net.vlanId != null ? net.vlanId : '—'}
                  </td>
                  <td>
                    {net.active !== false ? (
                      <CheckCircle size={13} style={{ color: '#00B388' }} />
                    ) : (
                      <XCircle size={13} style={{ color: '#EF4444' }} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div
        className="flex items-center gap-4 px-4 py-1.5 text-2xs"
        style={{ borderTop: '1px solid #1E2A45', color: '#566278', background: '#0D1117' }}
      >
        <span>Showing {networks.length} networks</span>
        {isFetching && <span style={{ color: '#00B388' }}>Refreshing…</span>}
      </div>
    </div>
  )
}
