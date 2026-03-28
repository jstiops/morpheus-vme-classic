import { clsx } from 'clsx'
import type { PowerState } from '@/types/morpheus'

interface Props {
  status: PowerState | string
  size?: number
  showLabel?: boolean
}

const STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  stopped: 'Stopped',
  suspended: 'Suspended',
  failed: 'Failed',
  warning: 'Warning',
  unknown: 'Unknown',
  provisioning: 'Provisioning',
  provisioned: 'Provisioned',
  starting: 'Starting',
  stopping: 'Stopping',
  maintenance:    'Maintenance',
  maintenancing:  'Maintenancing',
}

export function StatusDot({ status, size = 8, showLabel = false }: Props) {
  const s = (status || 'unknown').toLowerCase()

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={clsx('status-dot', s)}
        style={{ width: size, height: size, minWidth: size }}
      />
      {showLabel && (
        <span
          className="text-xs"
          style={{
            color:
              s === 'running'
                ? '#00B388'
                : s === 'failed'
                  ? '#EF4444'
                  : s === 'suspended' || s === 'warning'
                    ? '#F59E0B'
                    : '#6B7280',
          }}
        >
          {STATUS_LABELS[s] ?? status}
        </span>
      )}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const s = (status || 'unknown').toLowerCase()

  const colorMap: Record<string, { bg: string; text: string }> = {
    running:      { bg: 'rgba(0,179,136,0.15)',   text: '#00B388' },
    provisioned:  { bg: 'rgba(0,179,136,0.15)',   text: '#00B388' },
    stopped:      { bg: 'rgba(107,114,128,0.15)',  text: '#9CA3AF' },
    suspended:    { bg: 'rgba(245,158,11,0.15)',   text: '#F59E0B' },
    failed:       { bg: 'rgba(239,68,68,0.15)',    text: '#EF4444' },
    warning:      { bg: 'rgba(245,158,11,0.15)',   text: '#F59E0B' },
    maintenance:    { bg: 'rgba(245,158,11,0.15)',   text: '#F59E0B' },
    maintenancing:  { bg: 'rgba(96,165,250,0.15)',   text: '#60A5FA' },
    provisioning: { bg: 'rgba(59,130,246,0.15)',   text: '#60A5FA' },
    starting:     { bg: 'rgba(59,130,246,0.15)',   text: '#60A5FA' },
    stopping:     { bg: 'rgba(107,114,128,0.15)',  text: '#9CA3AF' },
    unknown:      { bg: 'rgba(107,114,128,0.15)',  text: '#9CA3AF' },
  }

  const { bg, text } = colorMap[s] ?? colorMap.unknown

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-2xs font-medium"
      style={{ background: bg, color: text }}
    >
      <span
        className={clsx('status-dot', s)}
        style={{ width: 6, height: 6, minWidth: 6 }}
      />
      {STATUS_LABELS[s] ?? status}
    </span>
  )
}
