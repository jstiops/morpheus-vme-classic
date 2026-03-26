import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { getInstanceStats } from '@/api/instances'
import { PageLoader } from '@/components/common/LoadingSpinner'
import { formatBytes } from '@/utils/format'
import { format } from 'date-fns'

interface Props {
  instanceId: number
}

function ChartCard({
  title,
  data,
  color,
  yFormatter,
  tooltipFormatter,
  currentLabel,
}: {
  title: string
  data: Array<{ time: string; value: number }>
  color: string
  yFormatter: (v: number) => string
  tooltipFormatter: (v: number) => string
  currentLabel?: string
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="card-title mb-0">{title}</div>
        {currentLabel && (
          <span className="text-xs font-semibold" style={{ color }}>
            {currentLabel}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="h-36 flex items-center justify-center text-xs" style={{ color: '#566278' }}>
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 2" stroke="#1E2A45" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 10, fill: '#566278' }}
              tickFormatter={(v) => {
                try { return format(new Date(v), 'HH:mm') } catch { return v }
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#566278' }}
              tickFormatter={yFormatter}
              width={52}
            />
            <Tooltip
              contentStyle={{
                background: '#1A2035',
                border: '1px solid #2A3450',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(v) => {
                try { return format(new Date(v), 'HH:mm:ss') } catch { return String(v) }
              }}
              formatter={(v: number) => [tooltipFormatter(v), title]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${title})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

export function MonitorTab({ instanceId }: Props) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['instance-stats', instanceId],
    queryFn: () => getInstanceStats(instanceId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  // Memoize chart series so Math.random() fallback doesn't flicker on every render
  const charts = useMemo(() => {
    if (!stats) return null
    const now = Date.now()

    const makeSeries = (
      pts: Array<{ time: string; value: number }> | undefined,
      currentVal: number | undefined,
    ) => {
      if (pts && pts.length > 0) return pts
      if (currentVal == null || currentVal === 0) return []
      // Static synthetic baseline — no random, so no flicker
      return Array.from({ length: 20 }, (_, i) => ({
        time: new Date(now - (19 - i) * 90_000).toISOString(),
        value: currentVal,
      }))
    }

    const memPct = stats.usedMemory && stats.maxMemory
      ? (stats.usedMemory / stats.maxMemory) * 100
      : undefined

    const storPct = stats.usedStorage && stats.maxStorage
      ? (stats.usedStorage / stats.maxStorage) * 100
      : undefined

    const cpuData = makeSeries(stats.statsData?.cpu, stats.cpuUsage)

    const memData = makeSeries(
      stats.statsData?.memory?.map((p) => ({
        ...p,
        value: stats.maxMemory ? (p.value / stats.maxMemory) * 100 : p.value,
      })),
      memPct,
    )

    const storData = makeSeries(
      stats.statsData?.disk?.map((p) => ({
        ...p,
        value: stats.maxStorage ? (p.value / stats.maxStorage) * 100 : p.value,
      })),
      storPct,
    )

    const netData = makeSeries(
      stats.statsData?.networkRx?.map((p, i) => ({
        time: p.time,
        value: p.value + (stats.statsData?.networkTx?.[i]?.value ?? 0),
      })),
      (stats.networkRxUsage ?? 0) + (stats.networkTxUsage ?? 0),
    )

    return { cpuData, memData, storData, netData, memPct, storPct }
  }, [stats])

  if (isLoading) return <PageLoader />

  if (!stats || !charts) {
    return (
      <div className="empty-state">
        <p className="text-sm" style={{ color: '#8B9AB0' }}>No monitoring data available</p>
      </div>
    )
  }

  const cpuPct = stats.cpuUsage ?? 0

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Stat Summary Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'CPU', value: `${cpuPct.toFixed(1)}%`, color: cpuPct > 80 ? '#EF4444' : '#00B388' },
          { label: 'Memory Used', value: stats.usedMemory ? formatBytes(stats.usedMemory) : '—', color: (charts.memPct ?? 0) > 80 ? '#EF4444' : '#60A5FA' },
          { label: 'Storage Used', value: stats.usedStorage ? formatBytes(stats.usedStorage) : '—', color: (charts.storPct ?? 0) > 80 ? '#EF4444' : '#A78BFA' },
          { label: 'Network I/O', value: ((stats.networkRxUsage ?? 0) + (stats.networkTxUsage ?? 0)) > 0 ? `${((stats.networkRxUsage ?? 0) + (stats.networkTxUsage ?? 0)).toFixed(0)} KB/s` : '—', color: '#F59E0B' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center py-3">
            <div className="text-xl font-bold" style={{ color }}>{value}</div>
            <div className="text-2xs mt-1" style={{ color: '#566278' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* 4 Charts — matching VME Manager: Memory, Storage, CPU, Network */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="Memory"
          data={charts.memData}
          color="#60A5FA"
          yFormatter={(v) => `${v.toFixed(0)}%`}
          tooltipFormatter={(v) => `${v.toFixed(1)}%`}
          currentLabel={stats.usedMemory && stats.maxMemory ? `${formatBytes(stats.usedMemory)} / ${formatBytes(stats.maxMemory)}` : undefined}
        />
        <ChartCard
          title="Storage"
          data={charts.storData}
          color="#A78BFA"
          yFormatter={(v) => `${v.toFixed(0)}%`}
          tooltipFormatter={(v) => `${v.toFixed(1)}%`}
          currentLabel={stats.usedStorage && stats.maxStorage ? `${formatBytes(stats.usedStorage)} / ${formatBytes(stats.maxStorage)}` : undefined}
        />
        <ChartCard
          title="CPU"
          data={charts.cpuData}
          color="#00B388"
          yFormatter={(v) => `${v.toFixed(0)}%`}
          tooltipFormatter={(v) => `${v.toFixed(1)}%`}
          currentLabel={`${cpuPct.toFixed(1)}%`}
        />
        <ChartCard
          title="Network"
          data={charts.netData}
          color="#F59E0B"
          yFormatter={(v) => `${v.toFixed(0)} KB/s`}
          tooltipFormatter={(v) => `${v.toFixed(1)} KB/s`}
          currentLabel={((stats.networkRxUsage ?? 0) + (stats.networkTxUsage ?? 0)) > 0
            ? `↓${stats.networkRxUsage?.toFixed(0)} ↑${stats.networkTxUsage?.toFixed(0)} KB/s`
            : undefined}
        />
      </div>
    </div>
  )
}
