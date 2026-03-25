import { formatBytes, formatPercent } from '@/utils/format'
import { StatusBadge } from '@/components/common/StatusDot'
import type { Instance } from '@/types/morpheus'
import { Server, Cpu, Network, Tag } from 'lucide-react'

interface Props {
  instance: Instance
  hostName?: string
}

function InfoCard({
  title,
  rows,
}: {
  title: string
  rows: Array<[string, React.ReactNode]>
}) {
  return (
    <div className="card">
      <div className="card-title">{title}</div>
      <dl className="space-y-2.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start gap-2">
            <dt className="text-xs shrink-0" style={{ color: '#566278', width: 130 }}>
              {label}
            </dt>
            <dd className="text-xs break-all" style={{ color: '#D4D9E3' }}>
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function ResourceGauge({
  label,
  used,
  max,
  unit = 'bytes',
}: {
  label: string
  used: number
  max: number
  unit?: 'bytes' | 'percent'
}) {
  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0
  const color = pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#00B388'

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs" style={{ color: '#8B9AB0' }}>
          {label}
        </span>
        <span className="text-xs font-medium" style={{ color }}>
          {unit === 'bytes'
            ? `${formatBytes(used)} / ${formatBytes(max)}`
            : `${formatPercent(used)}`}
        </span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function SummaryTab({ instance, hostName }: Props) {
  const container = instance.containers?.[0]
  const stats = instance.stats ?? container?.stats

  const ip =
    container?.ip ?? container?.internalIp ?? instance.connectionInfo?.[0]?.ip

  return (
    <div className="grid grid-cols-3 gap-4 max-w-5xl">
      {/* VM Identity */}
      <div className="col-span-3">
        <div
          className="flex items-center gap-4 p-4 rounded-lg"
          style={{ background: '#141C2E', border: '1px solid #1E2A45' }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(0,179,136,0.12)',
              border: '1px solid rgba(0,179,136,0.25)',
            }}
          >
            <Server size={22} style={{ color: '#00B388' }} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {instance.name}
            </h2>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <StatusBadge status={instance.status} />
              <span className="text-xs" style={{ color: '#566278' }}>
                {instance.cloud?.name}
              </span>
              {ip && (
                <span
                  className="text-xs font-mono px-1.5 py-0.5 rounded"
                  style={{
                    background: '#1E2A45',
                    color: '#8B9AB0',
                  }}
                >
                  {ip}
                </span>
              )}
            </div>
          </div>
          {instance.plan && (
            <div
              className="text-xs px-2.5 py-1 rounded shrink-0"
              style={{ background: '#1E2A45', color: '#8B9AB0' }}
            >
              {instance.plan.name}
            </div>
          )}
        </div>
      </div>

      {/* Resources */}
      {stats && (
        <div className="card">
          <div className="card-title flex items-center gap-1.5">
            <Cpu size={12} style={{ color: '#00B388' }} />
            Resources
          </div>
          <div className="space-y-4">
            <ResourceGauge
              label="CPU Usage"
              used={stats.cpuUsage}
              max={100}
              unit="percent"
            />
            <ResourceGauge
              label="Memory"
              used={stats.usedMemory}
              max={stats.maxMemory}
            />
            <ResourceGauge
              label="Storage"
              used={stats.usedStorage}
              max={stats.maxStorage}
            />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 pt-3" style={{ borderTop: '1px solid #1E2A45' }}>
            {[
              ['CPU', `${container?.maxCores ?? instance.maxCores ?? '—'} vCPU`],
              ['RAM', formatBytes(stats.maxMemory)],
              ['Disk', formatBytes(stats.maxStorage)],
            ].map(([label, value]) => (
              <div key={label} className="text-center">
                <div className="text-xs font-medium text-white">{value}</div>
                <div className="text-2xs mt-0.5" style={{ color: '#566278' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VM Details */}
      <InfoCard
        title="VM Details"
        rows={[
          ['Instance ID', instance.id],
          ['Hostname', instance.hostName || container?.hostname || '—'],
          ['IP Address', ip || '—'],
          ['Host', hostName ?? '—'],
          ['Cloud', instance.cloud?.name ?? '—'],
          ['Group', instance.group?.name ?? '—'],
          ['Plan', instance.plan?.name ?? '—'],
          ['Instance Type', instance.instanceType?.name ?? '—'],
        ]}
      />

      {/* Dates & Owner */}
      <InfoCard
        title="Ownership & Dates"
        rows={[
          ['Created By', instance.createdBy?.username ?? '—'],
          ['Owner', instance.owner?.username ?? '—'],
          [
            'Date Created',
            instance.dateCreated
              ? new Date(instance.dateCreated).toLocaleString()
              : '—',
          ],
          [
            'Last Updated',
            instance.lastUpdated
              ? new Date(instance.lastUpdated).toLocaleString()
              : '—',
          ],
        ]}
      />

      {/* Network */}
      <div className="card">
        <div className="card-title flex items-center gap-1.5">
          <Network size={12} style={{ color: '#00B388' }} />
          Network
        </div>
        {instance.containers?.length > 0 ? (
          <div className="space-y-3">
            {instance.containers.slice(0, 4).flatMap((c) =>
              (c.interfaces ?? []).length > 0
                ? c.interfaces!.map((iface) => (
                    <div
                      key={iface.id}
                      className="p-2.5 rounded"
                      style={{ background: '#0D1117', border: '1px solid #1E2A45' }}
                    >
                      <div className="text-xs font-medium text-white mb-1">
                        {iface.network?.name ?? iface.name ?? 'Unknown Network'}
                      </div>
                      <div className="text-xs space-y-0.5" style={{ color: '#8B9AB0' }}>
                        {iface.ipAddress && (
                          <div>IP: <span className="font-mono text-white">{iface.ipAddress}</span></div>
                        )}
                        {iface.ipSubnet && (
                          <div>Subnet: <span className="font-mono">{iface.ipSubnet}</span></div>
                        )}
                      </div>
                    </div>
                  ))
                : [
                    <div
                      key={c.id}
                      className="p-2.5 rounded"
                      style={{ background: '#0D1117', border: '1px solid #1E2A45' }}
                    >
                      <div className="text-xs space-y-0.5" style={{ color: '#8B9AB0' }}>
                        {(c.ip ?? c.internalIp) && (
                          <div>IP: <span className="font-mono text-white">{c.ip ?? c.internalIp}</span></div>
                        )}
                        {c.externalIp && (
                          <div>External: <span className="font-mono text-white">{c.externalIp}</span></div>
                        )}
                      </div>
                    </div>,
                  ],
            )}
          </div>
        ) : (
          <p className="text-xs" style={{ color: '#566278' }}>No network info</p>
        )}
      </div>

      {/* Tags */}
      {instance.tags && instance.tags.length > 0 && (
        <div className="card">
          <div className="card-title flex items-center gap-1.5">
            <Tag size={12} style={{ color: '#00B388' }} />
            Tags
          </div>
          <div className="flex flex-wrap gap-1.5">
            {instance.tags.map((tag) => (
              <span
                key={tag.id}
                className="text-xs px-2 py-0.5 rounded"
                style={{ background: '#1E2A45', color: '#8B9AB0' }}
              >
                {tag.name}{tag.value ? `: ${tag.value}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {instance.notes && (
        <div className="card col-span-2">
          <div className="card-title">Notes</div>
          <p className="text-xs whitespace-pre-wrap" style={{ color: '#8B9AB0' }}>
            {instance.notes}
          </p>
        </div>
      )}
    </div>
  )
}
