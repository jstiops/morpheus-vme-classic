import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { formatBytes, formatPercent } from '@/utils/format'
import { StatusBadge } from '@/components/common/StatusDot'
import type { Instance, ComputeServer } from '@/types/morpheus'
import { Server, Cpu, Network, Tag, Pencil, X, Check, Loader2, FileText } from 'lucide-react'
import { updateServer } from '@/api/servers'

interface Props {
  instance: Instance
  vmServer?: ComputeServer
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

function DescriptionCard({ instance, vmServer }: { instance: Instance; vmServer?: ComputeServer }) {
  const queryClient = useQueryClient()
  const description = vmServer?.description ?? instance.description ?? ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(description)

  const mutation = useMutation({
    mutationFn: (desc: string) => {
      if (vmServer) {
        return updateServer(vmServer.id, { description: desc })
      }
      // fallback: no server record available
      return Promise.reject(new Error('No server record available to update'))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instance', instance.id] })
      if (vmServer) queryClient.invalidateQueries({ queryKey: ['server', vmServer.id] })
      setEditing(false)
    },
  })

  const startEdit = () => {
    setDraft(description)
    setEditing(true)
  }

  const cancel = () => {
    setEditing(false)
    setDraft(description)
  }

  return (
    <div className="card">
      <div className="card-title flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <FileText size={12} style={{ color: '#00B388' }} />
          Description
        </span>
        {!editing && (
          <button
            className="btn btn-ghost py-0.5 px-1.5 text-xs"
            onClick={startEdit}
            title="Edit description"
          >
            <Pencil size={11} />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2 mt-1">
          <textarea
            className="input resize-none w-full"
            rows={4}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={mutation.isPending}
            placeholder="Enter a description…"
            autoFocus
          />
          <div className="flex items-center gap-1.5 justify-end">
            <button
              className="btn btn-ghost py-1 px-2 text-xs"
              onClick={cancel}
              disabled={mutation.isPending}
            >
              <X size={11} />
              Cancel
            </button>
            <button
              className="btn btn-primary py-1 px-2 text-xs"
              onClick={() => mutation.mutate(draft)}
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? <><Loader2 size={11} className="animate-spin" /> Saving…</>
                : <><Check size={11} /> Save</>
              }
            </button>
          </div>
        </div>
      ) : (
        <p
          className="text-xs mt-1 whitespace-pre-wrap"
          style={{ color: description ? '#D4D9E3' : '#566278' }}
        >
          {description || 'No description set.'}
        </p>
      )}
    </div>
  )
}

export function SummaryTab({ instance, vmServer }: Props) {
  const container = instance.containers?.[0]
  const stats = instance.stats ?? container?.stats

  const ip =
    vmServer?.internalIp ?? vmServer?.externalIp ??
    container?.ip ?? container?.internalIp ?? instance.connectionInfo?.[0]?.ip

  // parentServer is the hypervisor (hvm01 etc.)
  const hostName = vmServer?.parentServer?.name
  // interfaces from the server record contain network name and adapter name
  const interfaces = vmServer?.interfaces ?? []

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
          ['Cores', vmServer?.maxCores ? `${vmServer.maxCores} vCPU` : instance.maxCores ? `${instance.maxCores} vCPU` : '—'],
          ['OS', vmServer?.serverOs?.name ?? ([vmServer?.platform, vmServer?.platformVersion].filter(Boolean).join(' ') || '—')],
          ['Plan', instance.plan?.name ?? '—'],
          ['Instance Type', instance.instanceType?.name ?? '—'],
        ]}
      />

      {/* Description */}
      <DescriptionCard instance={instance} vmServer={vmServer} />

      {/* Network */}
      <div className="card">
        <div className="card-title flex items-center gap-1.5">
          <Network size={12} style={{ color: '#00B388' }} />
          Network
        </div>
        {interfaces.length > 0 ? (
          <div className="space-y-3">
            {interfaces.map((iface) => (
              <div
                key={iface.id}
                className="p-2.5 rounded"
                style={{ background: '#0D1117', border: '1px solid #1E2A45' }}
              >
                <div className="text-xs font-medium text-white mb-1.5">
                  {iface.network?.name ?? 'Unknown Network'}
                </div>
                <div className="text-xs space-y-1" style={{ color: '#8B9AB0' }}>
                  {iface.name && (
                    <div>Adapter: <span style={{ color: '#D4D9E3' }}>{iface.name}</span></div>
                  )}
                  {iface.ipAddress && (
                    <div>IP: <span className="font-mono" style={{ color: '#D4D9E3' }}>{iface.ipAddress}</span></div>
                  )}
                  {iface.macAddress && (
                    <div>MAC: <span className="font-mono">{iface.macAddress}</span></div>
                  )}
                  <div>DHCP: <span style={{ color: iface.dhcp ? '#00B388' : '#566278' }}>{iface.dhcp ? 'Yes' : 'No'}</span></div>
                </div>
              </div>
            ))}
          </div>
        ) : ip ? (
          <div
            className="p-2.5 rounded"
            style={{ background: '#0D1117', border: '1px solid #1E2A45' }}
          >
            <div className="text-xs" style={{ color: '#8B9AB0' }}>
              IP: <span className="font-mono" style={{ color: '#D4D9E3' }}>{ip}</span>
            </div>
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
