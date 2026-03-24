import { useNavigate, useLocation } from 'react-router-dom'
import {
  Server,
  Monitor,
  Network,
  HardDrive,
  Layers,
  LayoutDashboard,
} from 'lucide-react'
import { clsx } from 'clsx'

export function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const navItem = (
    path: string,
    label: string,
    Icon: React.ElementType,
  ) => (
    <button
      key={path}
      className={clsx('tree-node w-full text-left', isActive(path) && 'selected')}
      style={{ paddingLeft: 8 }}
      onClick={() => navigate(path)}
    >
      <Icon size={13} className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  )

  return (
    <aside className="sidebar">
      <div className="px-2 pt-3 pb-2">
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
    </aside>
  )
}
