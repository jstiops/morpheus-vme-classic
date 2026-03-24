import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronRight,
  ChevronDown,
  Globe,
  Server,
  Monitor,
  Network,
  HardDrive,
  Box,
  Layers,
  LayoutDashboard,
} from 'lucide-react'
import { useTreeStore } from '@/store/treeStore'
import { useUiStore } from '@/store/uiStore'
import { useQuery } from '@tanstack/react-query'
import { listZones } from '@/api/clouds'
import { listInstances } from '@/api/instances'
import { listServers } from '@/api/servers'
import { StatusDot } from '@/components/common/StatusDot'
import { clsx } from 'clsx'
import type { PowerState } from '@/types/morpheus'

export function Sidebar() {
  const { sidebarCollapsed, expanded, selected, toggleExpand, setSelected } =
    useTreeStore()
  const { globalSearch } = useUiStore()
  const navigate = useNavigate()
  const location = useLocation()

  const { data: zonesData } = useQuery({
    queryKey: ['zones'],
    queryFn: () => listZones(),
    staleTime: 60_000,
  })

  const { data: instancesData } = useQuery({
    queryKey: ['instances'],
    queryFn: () => listInstances({ max: 50 }),
    staleTime: 30_000,
  })

  const { data: serversData } = useQuery({
    queryKey: ['servers'],
    queryFn: () => listServers({ max: 50 }),
    staleTime: 60_000,
  })

  const zones = zonesData?.zones ?? []
  const instances = instancesData?.instances ?? []
  const servers = serversData?.servers ?? []

  const search = globalSearch.toLowerCase()

  const filteredInstances = search
    ? instances.filter(
        (i) =>
          i.name.toLowerCase().includes(search) ||
          i.cloud?.name?.toLowerCase().includes(search),
      )
    : instances

  const isActive = (path: string) => location.pathname === path

  const navItem = (
    path: string,
    label: string,
    Icon: React.ElementType,
    indent = 0,
  ) => (
    <button
      key={path}
      className={clsx('tree-node w-full text-left', isActive(path) && 'selected')}
      style={{ paddingLeft: 8 + indent * 16 }}
      onClick={() => navigate(path)}
    >
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )

  return (
    <aside className={clsx('sidebar', sidebarCollapsed && 'collapsed')}>
      {/* Quick Nav */}
      <div
        className="px-2 pt-3 pb-2"
        style={{ borderBottom: '1px solid #1E2A45' }}
      >
        <div className="text-2xs font-semibold uppercase tracking-widest mb-1.5 px-2" style={{ color: '#3A4560' }}>
          Navigation
        </div>
        {navItem('/dashboard', 'Dashboard', LayoutDashboard)}
        {navItem('/vms', 'Virtual Machines', Monitor)}
        {navItem('/hosts', 'Hosts', Server)}
        {navItem('/clusters', 'Clusters', Layers)}
        {navItem('/networks', 'Networks', Network)}
        {navItem('/storage', 'Storage', HardDrive)}
      </div>

      {/* Inventory Tree */}
      <div className="flex-1 overflow-y-auto px-2 pt-2">
        <div className="text-2xs font-semibold uppercase tracking-widest mb-1.5 px-2" style={{ color: '#3A4560' }}>
          Inventory
        </div>

        {/* Datacenters */}
        <TreeSection
          id="datacenters"
          label="Datacenters"
          icon={Globe}
          expanded={expanded}
          toggleExpand={toggleExpand}
        >
          {zones.map((zone) => (
            <TreeSection
              key={`zone-${zone.id}`}
              id={`zone-${zone.id}`}
              label={zone.name}
              icon={Globe}
              expanded={expanded}
              toggleExpand={toggleExpand}
              indent={1}
              onClick={() => navigate('/vms')}
              selected={selected === `zone-${zone.id}`}
              onSelect={() => setSelected(`zone-${zone.id}`)}
            >
              {/* Hosts under zone */}
              {servers
                .filter((s) => s.cloud?.id === zone.id)
                .slice(0, 20)
                .map((server) => (
                  <button
                    key={`server-${server.id}`}
                    className={clsx(
                      'tree-node w-full text-left',
                      selected === `server-${server.id}` && 'selected',
                    )}
                    style={{ paddingLeft: 8 + 2 * 16 }}
                    onClick={() => {
                      setSelected(`server-${server.id}`)
                      navigate('/hosts')
                    }}
                  >
                    <Server size={11} className="shrink-0" />
                    <span className="truncate">{server.name}</span>
                  </button>
                ))}

              {/* VMs under zone */}
              <TreeSection
                id={`zone-${zone.id}-vms`}
                label={`VMs (${filteredInstances.filter((i) => i.cloud?.id === zone.id).length})`}
                icon={Monitor}
                expanded={expanded}
                toggleExpand={toggleExpand}
                indent={1}
              >
                {filteredInstances
                  .filter((i) => i.cloud?.id === zone.id)
                  .slice(0, 30)
                  .map((inst) => (
                    <button
                      key={`vm-${inst.id}`}
                      className={clsx(
                        'tree-node w-full text-left',
                        selected === `vm-${inst.id}` && 'selected',
                      )}
                      style={{ paddingLeft: 8 + 2 * 16 }}
                      onClick={() => {
                        setSelected(`vm-${inst.id}`)
                        navigate(`/vms/${inst.id}`)
                      }}
                    >
                      <StatusDot status={inst.status as PowerState} size={6} />
                      <span className="truncate">{inst.name}</span>
                    </button>
                  ))}
              </TreeSection>
            </TreeSection>
          ))}

          {zones.length === 0 && (
            <div className="text-2xs px-4 py-2" style={{ color: '#566278' }}>
              No datacenters found
            </div>
          )}
        </TreeSection>

        {/* Networks */}
        <TreeSection
          id="networks-tree"
          label="Networks"
          icon={Network}
          expanded={expanded}
          toggleExpand={toggleExpand}
        >
          <button
            className={clsx('tree-node w-full text-left', isActive('/networks') && 'selected')}
            style={{ paddingLeft: 8 + 16 }}
            onClick={() => navigate('/networks')}
          >
            <Network size={11} />
            <span>All Networks</span>
          </button>
        </TreeSection>

        {/* Storage */}
        <TreeSection
          id="storage-tree"
          label="Storage"
          icon={HardDrive}
          expanded={expanded}
          toggleExpand={toggleExpand}
        >
          <button
            className={clsx('tree-node w-full text-left', isActive('/storage') && 'selected')}
            style={{ paddingLeft: 8 + 16 }}
            onClick={() => navigate('/storage')}
          >
            <HardDrive size={11} />
            <span>Datastores</span>
          </button>
        </TreeSection>

        {/* Templates placeholder */}
        <TreeSection
          id="templates-tree"
          label="Templates"
          icon={Box}
          expanded={expanded}
          toggleExpand={toggleExpand}
        >
          <div className="text-2xs px-5 py-1.5" style={{ color: '#566278' }}>
            No templates
          </div>
        </TreeSection>
      </div>

      {/* Sidebar Footer */}
      <div
        className="px-3 py-2 text-2xs"
        style={{ borderTop: '1px solid #1E2A45', color: '#3A4560' }}
      >
        {instances.length} VMs · {servers.length} Hosts · {zones.length} DCs
      </div>
    </aside>
  )
}

// ─── Tree Section ─────────────────────────────────────────────────────────────

interface TreeSectionProps {
  id: string
  label: string
  icon: React.ElementType
  expanded: Set<string>
  toggleExpand: (id: string) => void
  children?: React.ReactNode
  indent?: number
  onClick?: () => void
  selected?: boolean
  onSelect?: () => void
}

function TreeSection({
  id,
  label,
  icon: Icon,
  expanded,
  toggleExpand,
  children,
  indent = 0,
  onClick,
  selected,
  onSelect,
}: TreeSectionProps) {
  const isExpanded = expanded.has(id)

  return (
    <div>
      <button
        className={clsx('tree-node w-full text-left', selected && 'selected')}
        style={{ paddingLeft: 8 + indent * 16 }}
        onClick={() => {
          toggleExpand(id)
          onClick?.()
          onSelect?.()
        }}
      >
        {isExpanded ? (
          <ChevronDown size={12} className="shrink-0" style={{ color: '#566278' }} />
        ) : (
          <ChevronRight size={12} className="shrink-0" style={{ color: '#566278' }} />
        )}
        <Icon size={13} className="shrink-0" style={{ color: selected ? '#00B388' : undefined }} />
        <span className="truncate flex-1">{label}</span>
      </button>
      {isExpanded && children && (
        <div>{children}</div>
      )}
    </div>
  )
}
