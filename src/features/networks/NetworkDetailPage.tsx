import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listNetworks } from '@/api/clouds'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { ArrowLeft, Network, CheckCircle, XCircle } from 'lucide-react'

export function NetworkDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const netId = Number(id)

  const { data, isLoading } = useQuery({
    queryKey: ['networks'],
    queryFn: () => listNetworks({ max: 100 }),
    staleTime: 60_000,
  })

  if (isLoading) return <PageLoader />

  const net = data?.networks?.find((n) => n.id === netId)

  if (!net) return (
    <div className="empty-state">
      <p>Network not found</p>
      <button className="btn btn-secondary" onClick={() => navigate('/networks')}>Back to Networks</button>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <button className="btn btn-ghost p-1" onClick={() => navigate('/networks')}>
          <ArrowLeft size={15} />
        </button>
        <Network size={16} style={{ color: '#60A5FA' }} />
        <h1 className="text-base font-semibold text-white flex-1 truncate">
          {net.displayName ?? net.name}
        </h1>
        <span
          className="text-xs"
          style={{ color: net.active !== false ? '#00B388' : '#EF4444' }}
        >
          {net.active !== false ? 'Active' : 'Inactive'}
        </span>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        <button className="tab-item active">Summary</button>
      </div>

      {/* Summary content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-3 gap-4 max-w-5xl">
          {/* Identity */}
          <div className="col-span-3">
            <div
              className="flex items-center gap-4 p-4 rounded-lg"
              style={{ background: '#141C2E', border: '1px solid #1E2A45' }}
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)' }}
              >
                <Network size={22} style={{ color: '#60A5FA' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-white truncate">
                  {net.displayName ?? net.name}
                </h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs" style={{ color: '#566278' }}>{net.zone?.name}</span>
                  {net.cidr && (
                    <span
                      className="text-xs font-mono px-1.5 py-0.5 rounded"
                      style={{ background: '#1E2A45', color: '#8B9AB0' }}
                    >
                      {net.cidr}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Network Details */}
          <div className="card col-span-2">
            <div className="card-title">Network Details</div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 mt-2">
              {[
                ['Name', net.name],
                ['Display Name', net.displayName ?? net.name],
                ['CIDR', net.cidr],
                ['Gateway', net.gateway],
                ['Cloud', net.zone?.name],
                ['Type', net.type?.name],
                ['VLAN ID', net.vlanId != null ? String(net.vlanId) : undefined],
                ['Code', net.code],
              ]
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label as string} className="flex gap-2">
                    <dt className="text-xs shrink-0" style={{ color: '#566278', width: 110 }}>{label}:</dt>
                    <dd className="text-xs text-white font-mono">{value as string}</dd>
                  </div>
                ))}
            </dl>
          </div>

          {/* Flags */}
          <div className="card">
            <div className="card-title">Configuration</div>
            <div className="space-y-3 mt-2">
              {[
                ['DHCP Enabled', net.dhcpServer],
                ['Active', net.active !== false],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#8B9AB0' }}>{label as string}</span>
                  {value
                    ? <CheckCircle size={14} style={{ color: '#00B388' }} />
                    : <XCircle size={14} style={{ color: '#566278' }} />
                  }
                </div>
              ))}
            </div>
          </div>

          {/* Description */}
          {net.description && (
            <div className="card col-span-3">
              <div className="card-title">Description</div>
              <p className="text-xs mt-1" style={{ color: '#8B9AB0' }}>{net.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
