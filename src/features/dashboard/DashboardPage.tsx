import { useQuery } from '@tanstack/react-query'
import { listInstances } from '@/api/instances'
import { listServers } from '@/api/servers'
import { listClusters } from '@/api/clouds'
import { useNavigate } from 'react-router-dom'
import { Monitor, Server, Layers, Activity, Play, Square, AlertTriangle, HardDrive } from 'lucide-react'
import { formatBytes } from '@/utils/format'

interface StatCardProps {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  onClick?: () => void
}

function StatCard({ title, value, sub, icon: Icon, color, onClick }: StatCardProps) {
  return (
    <button
      className="card text-left transition-all hover:scale-[1.01]"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div
            className="text-2xl font-bold"
            style={{ color, letterSpacing: '-0.02em' }}
          >
            {value}
          </div>
          <div className="text-sm font-medium text-white mt-0.5">{title}</div>
          {sub && (
            <div className="text-xs mt-1" style={{ color: '#566278' }}>
              {sub}
            </div>
          )}
        </div>
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
    </button>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()

  const { data: instancesData } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 50 }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const { data: serversData } = useQuery({
    queryKey: ['servers', 'hypervisors'],
    queryFn: () => listServers({ max: 100, vmHypervisor: true }),
    staleTime: 60_000,
  })

  const { data: clustersData } = useQuery({
    queryKey: ['clusters'],
    queryFn: () => listClusters(),
    staleTime: 120_000,
    retry: 0,
  })

  const instances = instancesData?.instances ?? []
  const servers = (serversData?.servers ?? []).filter(s => s.osMorpheusType !== 'esxi' && s.osType !== 'esxi')
  const clusters = clustersData?.clusters ?? []

  const running = instances.filter((i) => i.status === 'running').length
  const stopped = instances.filter((i) => i.status === 'stopped').length
  const failed = instances.filter((i) => i.status === 'failed').length
  const suspended = instances.filter((i) => i.status === 'suspended').length

  const totalMem = instances.reduce((a, i) => a + (i.stats?.maxMemory ?? 0), 0)
  const usedMem = instances.reduce((a, i) => a + (i.stats?.usedMemory ?? 0), 0)

  const avgCpu =
    instances.filter((i) => i.status === 'running').length > 0
      ? instances
          .filter((i) => i.status === 'running')
          .reduce((a, i) => a + (i.stats?.cpuUsage ?? 0), 0) /
          instances.filter((i) => i.status === 'running').length
      : 0

  return (
    <div className="p-4 space-y-6 max-w-6xl">
      {/* Welcome */}
      <div>
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <p className="text-xs mt-0.5" style={{ color: '#566278' }}>
          HPE Morpheus VME Classic — Inventory Overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Virtual Machines"
          value={instances.length}
          sub={`${running} running`}
          icon={Monitor}
          color="#00B388"
          onClick={() => navigate('/vms')}
        />
        <StatCard
          title="Hosts"
          value={servers.length}
          sub={`Hypervisors`}
          icon={Server}
          color="#60A5FA"
          onClick={() => navigate('/hosts')}
        />
        <StatCard
          title="Clusters"
          value={clusters.length}
          sub="Morpheus clusters"
          icon={Layers}
          color="#A78BFA"
          onClick={() => navigate('/clusters')}
        />
        <StatCard
          title="Avg CPU Usage"
          value={`${avgCpu.toFixed(1)}%`}
          sub="Running VMs"
          icon={Activity}
          color={avgCpu > 80 ? '#EF4444' : '#F59E0B'}
        />
      </div>

      {/* VM State Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Power States */}
        <div className="card md:col-span-1">
          <div className="card-title">VM Power States</div>
          <div className="space-y-3">
            {[
              { label: 'Running', count: running, color: '#00B388', icon: Play },
              { label: 'Stopped', count: stopped, color: '#6B7280', icon: Square },
              { label: 'Suspended', count: suspended, color: '#F59E0B', icon: AlertTriangle },
              { label: 'Failed', count: failed, color: '#EF4444', icon: AlertTriangle },
            ].map(({ label, count, color, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon size={12} style={{ color }} />
                  <span className="text-xs" style={{ color: '#8B9AB0' }}>
                    {label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="h-1.5 rounded"
                    style={{
                      width: instances.length > 0
                        ? Math.max(4, (count / instances.length) * 120)
                        : 4,
                      background: color,
                      opacity: 0.7,
                    }}
                  />
                  <span
                    className="text-xs font-medium w-6 text-right"
                    style={{ color }}
                  >
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Memory */}
        <div className="card">
          <div className="card-title flex items-center gap-1.5">
            <HardDrive size={11} style={{ color: '#00B388' }} />
            Memory (Running VMs)
          </div>
          {usedMem > 0 ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span style={{ color: '#8B9AB0' }}>Used</span>
                  <span className="font-medium" style={{ color: '#60A5FA' }}>
                    {formatBytes(usedMem)}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: totalMem > 0 ? `${(usedMem / totalMem) * 100}%` : '0%',
                      background: '#60A5FA',
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#566278' }}>Total Allocated</span>
                <span style={{ color: '#8B9AB0' }}>{formatBytes(totalMem)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: '#566278' }}>Utilization</span>
                <span style={{ color: '#D4D9E3' }}>
                  {totalMem > 0 ? `${((usedMem / totalMem) * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs" style={{ color: '#566278' }}>
              No memory data available
            </p>
          )}
        </div>

        {/* Recent VMs */}
        <div className="card">
          <div className="card-title">Recent VMs</div>
          <div className="space-y-2">
            {instances
              .slice()
              .sort(
                (a, b) =>
                  new Date(b.dateCreated).getTime() -
                  new Date(a.dateCreated).getTime(),
              )
              .slice(0, 6)
              .map((inst) => (
                <button
                  key={inst.id}
                  className="flex items-center gap-2 w-full text-left hover:bg-content-card-hover rounded px-1 py-0.5 transition-colors"
                  onClick={() => navigate(`/vms/${inst.id}`)}
                >
                  <span
                    className="status-dot shrink-0"
                    style={{
                      background:
                        inst.status === 'running'
                          ? '#00B388'
                          : inst.status === 'failed'
                            ? '#EF4444'
                            : '#6B7280',
                    }}
                  />
                  <span className="text-xs truncate flex-1 text-white">
                    {inst.name}
                  </span>
                  <span
                    className="text-2xs shrink-0"
                    style={{ color: '#566278' }}
                  >
                    {inst.cloud?.name}
                  </span>
                </button>
              ))}
            {instances.length === 0 && (
              <p className="text-xs" style={{ color: '#566278' }}>
                No VMs
              </p>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
