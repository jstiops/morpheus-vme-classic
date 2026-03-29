import { useState, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { listInstances } from '@/api/instances'
import { listServers } from '@/api/servers'
import { listClusters, listNetworks, listDataStores } from '@/api/clouds'
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

type TreeTab = 'hc' | 'storage' | 'networking'

// ─── Tree primitives ──────────────────────────────────────────────────────────

function Section({
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

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={clsx('flex items-center justify-center rounded p-1.5 transition-colors')}
      style={{
        color: active ? '#00B388' : '#566278',
        background: active ? 'rgba(0,179,136,0.1)' : 'transparent',
        border: active ? '1px solid rgba(0,179,136,0.25)' : '1px solid transparent',
      }}
    >
      <Icon size={14} />
    </button>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { sidebarCollapsed } = useTreeStore()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeTab, setActiveTab] = useState<TreeTab>('hc')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const { data: instancesData } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 200 }),
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
  const { data: datastoresData } = useQuery({
    queryKey: ['datastores'],
    queryFn: () => listDataStores(),
    staleTime: 120_000,
    retry: 0,
  })

  const byName = <T extends { name: string }>(arr: T[]) =>
    [...arr].sort((a, b) => a.name.localeCompare(b.name))

  const instances = instancesData?.instances ?? []
  const allHypervisors = hypervisorsData?.servers ?? []
  const clusters = byName(clustersData?.clusters ?? [])

  // Map: hostServerId → status (for status dots in cluster host list)
  const hostStatusMap = useMemo(() => {
    const map = new Map<number, string>()
    for (const h of allHypervisors) map.set(h.id, h.status)
    return map
  }, [allHypervisors])

  // Set of host server IDs that belong to any cluster
  const clusterHostIds = useMemo(() => {
    const ids = new Set<number>()
    for (const c of clusters) for (const s of c.servers ?? []) ids.add(s.id)
    return ids
  }, [clusters])

  // Standalone hypervisors: not in any cluster
  const standaloneHosts = useMemo(
    () => byName(allHypervisors.filter((h) => !clusterHostIds.has(h.id))),
    [allHypervisors, clusterHostIds],
  )

  const networks = byName(
    (networksData?.networks ?? []).filter(
      (n) => !(n.type?.name ?? '').toLowerCase().includes('vmware'),
    ),
  )
  const DATASTORE_TYPES = ['directory', 'localdir', 'generic', 'localgeneric']
  const datastores = byName(
    (datastoresData ?? []).filter(
      (ds) => DATASTORE_TYPES.includes((ds.type ?? '').toLowerCase()),
    ),
  )

  const p = location.pathname

  return (
    <aside className={clsx('sidebar', sidebarCollapsed && 'collapsed')}>
      <div className="flex flex-col h-full">

        {/* Dashboard */}
        <div className="px-2 pt-2 pb-1">
          <button
            className={clsx('tree-node w-full text-left', p === '/dashboard' && 'selected')}
            style={{ paddingLeft: 8 }}
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard size={12} className="shrink-0" />
            <span className="text-xs">Dashboard</span>
          </button>
        </div>

        {/* Tab bar */}
        <div
          className="flex items-center gap-1 px-2 pb-1.5"
          style={{ borderBottom: '1px solid #1E2A45' }}
        >
          <TabButton
            icon={Layers}
            label="Hosts & Clusters"
            active={activeTab === 'hc'}
            onClick={() => setActiveTab('hc')}
          />
          <TabButton
            icon={HardDrive}
            label="Storage"
            active={activeTab === 'storage'}
            onClick={() => setActiveTab('storage')}
          />
          <TabButton
            icon={Network}
            label="Networking"
            active={activeTab === 'networking'}
            onClick={() => setActiveTab('networking')}
          />
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">

          {/* ── Hosts & Clusters tab ── */}
          {activeTab === 'hc' && (
            <>
              {clusters.map((cluster) => {
                const clusterVms = byName(
                  instances.filter((i) => i.cloud?.id === cluster.zone?.id),
                )
                const clusterHosts = byName(cluster.servers ?? [])
                return (
                  <Section
                    key={cluster.id}
                    label={cluster.name}
                    icon={Layers}
                    count={clusterHosts.length}
                    expanded={expanded.has(`cluster-${cluster.id}`)}
                    onToggle={() => toggle(`cluster-${cluster.id}`)}
                    active={p === `/clusters/${cluster.id}`}
                    onLabelClick={() => navigate(`/clusters/${cluster.id}`)}
                    indent={0}
                  >
                    {/* Hosts */}
                    {clusterHosts.map((srv) => (
                      <TreeItem
                        key={srv.id}
                        label={srv.name}
                        statusDot={hostStatusMap.get(srv.id) ?? 'unknown'}
                        indent={1}
                        active={p === `/hosts/${srv.id}`}
                        onClick={() => navigate(`/hosts/${srv.id}`)}
                      />
                    ))}

                    {/* Divider between hosts and VMs */}
                    {clusterVms.length > 0 && clusterHosts.length > 0 && (
                      <div
                        className="mx-3 my-0.5"
                        style={{ height: 1, background: '#1E2A45' }}
                      />
                    )}

                    {/* VMs */}
                    {clusterVms.map((inst) => (
                      <TreeItem
                        key={inst.id}
                        label={inst.name}
                        statusDot={inst.status}
                        indent={1}
                        active={p === `/vms/${inst.id}`}
                        onClick={() => navigate(`/vms/${inst.id}`)}
                      />
                    ))}
                  </Section>
                )
              })}

              {/* Standalone hosts (not in any cluster) */}
              {standaloneHosts.length > 0 && (
                <Section
                  label="Standalone Hosts"
                  icon={Server}
                  count={standaloneHosts.length}
                  expanded={expanded.has('standalone-hosts')}
                  onToggle={() => toggle('standalone-hosts')}
                  indent={0}
                >
                  {standaloneHosts.map((h) => (
                    <TreeItem
                      key={h.id}
                      label={h.name}
                      statusDot={h.status}
                      indent={1}
                      active={p === `/hosts/${h.id}`}
                      onClick={() => navigate(`/hosts/${h.id}`)}
                    />
                  ))}
                </Section>
              )}
            </>
          )}

          {/* ── Storage tab ── */}
          {activeTab === 'storage' && (
            <>
              {datastores.length === 0 ? (
                <p className="text-2xs px-2 py-3" style={{ color: '#566278' }}>No datastores</p>
              ) : datastores.map((ds) => (
                <TreeItem
                  key={ds.id}
                  label={ds.name}
                  sub={ds.zone?.name}
                  indent={0}
                  active={p === `/storage/${ds.id}`}
                  onClick={() => navigate(`/storage/${ds.id}`)}
                />
              ))}
            </>
          )}

          {/* ── Networking tab ── */}
          {activeTab === 'networking' && (
            <>
              {networks.length === 0 ? (
                <p className="text-2xs px-2 py-3" style={{ color: '#566278' }}>No networks</p>
              ) : networks.map((net) => (
                <TreeItem
                  key={net.id}
                  label={net.displayName ?? net.name}
                  sub={net.cidr ?? undefined}
                  indent={0}
                  active={p === `/networks/${net.id}`}
                  onClick={() => navigate(`/networks/${net.id}`)}
                />
              ))}
            </>
          )}

        </div>
      </div>
    </aside>
  )
}
