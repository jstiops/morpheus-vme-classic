import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listInstances } from '@/api/instances'
import { listServers } from '@/api/servers'
import { listClusters, listNetworks, listStorageVolumes } from '@/api/clouds'
import {
  ChevronRight,
  ChevronDown,
  Monitor,
  Server,
  Layers,
  Network,
  HardDrive,
  LayoutDashboard,
} from 'lucide-react'
import { clsx } from 'clsx'
import { StatusDot } from '@/components/common/StatusDot'
import { useTreeStore } from '@/store/treeStore'
import type { PowerState } from '@/types/morpheus'

// ─── Tree primitives ──────────────────────────────────────────────────────────

function Section({
  id: _id,
  label,
  icon: Icon,
  count,
  expanded,
  onToggle,
  children,
  active,
  onLabelClick,
  indent = 0,
}: {
  id: string
  label: string
  icon: React.ElementType
  count?: number
  expanded: boolean
  onToggle: () => void
  children?: React.ReactNode
  active?: boolean
  onLabelClick?: () => void
  indent?: number
}) {
  return (
    <div>
      <button
        className={clsx('tree-node w-full text-left', active && 'selected')}
        style={{ paddingLeft: 8 + indent * 16 }}
        onClick={() => { onToggle(); onLabelClick?.() }}
      >
        {expanded
          ? <ChevronDown size={11} className="shrink-0" style={{ color: '#566278' }} />
          : <ChevronRight size={11} className="shrink-0" style={{ color: '#566278' }} />
        }
        <Icon size={12} className="shrink-0" />
        <span className="truncate flex-1 text-xs">{label}</span>
        {count !== undefined && (
          <span
            className="text-2xs px-1 rounded shrink-0"
            style={{ background: '#1E2A45', color: '#566278' }}
          >
            {count}
          </span>
        )}
      </button>
      {expanded && children}
    </div>
  )
}

function TreeItem({
  label,
  sub,
  statusDot,
  indent = 1,
  active,
  onClick,
}: {
  label: string
  sub?: string
  statusDot?: string
  indent?: number
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      className={clsx('tree-node w-full text-left', active && 'selected')}
      style={{ paddingLeft: 8 + indent * 16 }}
      onClick={onClick}
    >
      {statusDot
        ? <StatusDot status={statusDot as PowerState} size={6} />
        : <span style={{ width: 6, display: 'inline-block' }} />
      }
      <span className="truncate flex-1 text-xs">{label}</span>
      {sub && <span className="text-2xs shrink-0" style={{ color: '#3A4560' }}>{sub}</span>}
    </button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { sidebarCollapsed } = useTreeStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['vms', 'clusters']),
  )
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const { data: instancesData } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 50 }),
    staleTime: 30_000,
  })
  const { data: hypervisorsData } = useQuery({
    queryKey: ['servers', 'hypervisors'],
    queryFn: () => listServers({ max: 100, vmHypervisor: true }),
    staleTime: 60_000,
  })
  const { data: clustersData } = useQuery({
    queryKey: ['clusters'],
    queryFn: () => listClusters(),
    staleTime: 60_000,
    retry: 0,
  })
  const { data: networksData } = useQuery({
    queryKey: ['networks'],
    queryFn: () => listNetworks({ max: 50 }),
    staleTime: 60_000,
  })
  const { data: storageData } = useQuery({
    queryKey: ['storage-volumes'],
    queryFn: () => listStorageVolumes({ max: 50 }),
    staleTime: 60_000,
  })

  const instances = instancesData?.instances ?? []
  const hypervisors = (hypervisorsData?.servers ?? []).filter(
    (s) => s.osMorpheusType !== 'esxi' && s.osType !== 'esxi',
  )
  const clusters = clustersData?.clusters ?? []
  const networks = networksData?.networks ?? []
  const storageVolumes = storageData?.storageVolumes ?? []

  const p = location.pathname

  return (
    <aside className={clsx('sidebar', sidebarCollapsed && 'collapsed')}>
      <div className="px-2 py-2 space-y-0.5">

        {/* Dashboard */}
        <button
          className={clsx('tree-node w-full text-left', p === '/dashboard' && 'selected')}
          style={{ paddingLeft: 8 }}
          onClick={() => navigate('/dashboard')}
        >
          <LayoutDashboard size={12} className="shrink-0" />
          <span className="text-xs">Dashboard</span>
        </button>

        {/* Virtual Machines */}
        <Section
          id="vms"
          label="Virtual Machines"
          icon={Monitor}
          count={instances.length}
          expanded={expanded.has('vms')}
          onToggle={() => toggle('vms')}
          active={p === '/vms'}
          onLabelClick={() => navigate('/vms')}
        >
          {instances.map((inst) => (
            <TreeItem
              key={inst.id}
              label={inst.name}
              statusDot={inst.status}
              active={p === `/vms/${inst.id}`}
              onClick={() => navigate(`/vms/${inst.id}`)}
            />
          ))}
        </Section>

        {/* Hosts */}
        <Section
          id="hosts"
          label="Hosts"
          icon={Server}
          count={hypervisors.length}
          expanded={expanded.has('hosts')}
          onToggle={() => toggle('hosts')}
          active={p === '/hosts'}
          onLabelClick={() => navigate('/hosts')}
        >
          {hypervisors.map((h) => (
            <TreeItem
              key={h.id}
              label={h.name}
              sub={h.osMorpheusType ?? h.osType ?? undefined}
              active={p === `/hosts/${h.id}`}
              onClick={() => navigate(`/hosts/${h.id}`)}
            />
          ))}
        </Section>

        {/* Clusters */}
        <Section
          id="clusters"
          label="Clusters"
          icon={Layers}
          count={clusters.length}
          expanded={expanded.has('clusters')}
          onToggle={() => toggle('clusters')}
          active={p === '/clusters'}
          onLabelClick={() => navigate('/clusters')}
        >
          {clusters.map((cluster) => (
            <Section
              key={cluster.id}
              id={`cluster-${cluster.id}`}
              label={cluster.name}
              icon={Layers}
              expanded={expanded.has(`cluster-${cluster.id}`)}
              onToggle={() => toggle(`cluster-${cluster.id}`)}
              active={p === `/clusters/${cluster.id}`}
              onLabelClick={() => navigate(`/clusters/${cluster.id}`)}
              indent={1}
            >
              {(cluster.servers ?? []).map((server) => (
                <TreeItem
                  key={server.id}
                  label={server.name}
                  indent={2}
                  active={p === `/hosts/${server.id}`}
                  onClick={() => navigate(`/hosts/${server.id}`)}
                />
              ))}
            </Section>
          ))}
        </Section>

        {/* Networks */}
        <Section
          id="networks"
          label="Networks"
          icon={Network}
          count={networks.length}
          expanded={expanded.has('networks')}
          onToggle={() => toggle('networks')}
          active={p === '/networks'}
          onLabelClick={() => navigate('/networks')}
        >
          {networks.map((net) => (
            <TreeItem
              key={net.id}
              label={net.displayName ?? net.name}
              sub={net.cidr ?? undefined}
              active={false}
              onClick={() => navigate('/networks')}
            />
          ))}
        </Section>

        {/* Storage */}
        <Section
          id="storage"
          label="Storage"
          icon={HardDrive}
          count={storageVolumes.length}
          expanded={expanded.has('storage')}
          onToggle={() => toggle('storage')}
          active={p === '/storage'}
          onLabelClick={() => navigate('/storage')}
        >
          {storageVolumes.map((vol) => (
            <TreeItem
              key={vol.id}
              label={vol.name}
              active={false}
              onClick={() => navigate('/storage')}
            />
          ))}
        </Section>

      </div>
    </aside>
  )
}
