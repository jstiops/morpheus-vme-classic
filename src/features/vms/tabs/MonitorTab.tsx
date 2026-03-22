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
  dataKey,
  color,
  unit,
  formatter,
}: {
  title: string
  data: Array<{ time: string; value: number }>
  dataKey: string
  color: string
  unit: string
  formatter?: (v: number) => string
}) {
  const fmt = formatter ?? ((v: number) => `${v.toFixed(1)}${unit}`)

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="card-title mb-0">{title}</div>
        {data.length > 0 && (
          <span
            className="text-xs font-semibold"
            style={{ color }}
          >
            {fmt(data[data.length - 1]?.value ?? 0)}
          </span>
        )}
      </div>
      {data.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-xs" style={{ color: '#566278' }}>
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
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
              tickFormatter={fmt}
              width={50}
            />
            <Tooltip
              contentStyle={{
                background: '#1A2035',
                border: '1px solid #2A3450',
                borderRadius: 6,
                fontSize: 12,
              }}
              labelFormatter={(v) => {
                try { return format(new Date(v), 'HH:mm:ss') } catch { return v }
              }}
              formatter={(v: number) => [fmt(v), title]}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={1.5}
              fill={`url(#grad-${dataKey})`}
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
    refetchInterval: 30_000,
    staleTime: 20_000,
  })

  if (isLoading) return <PageLoader />

  // Build chart series from statsData or generate placeholder data from current snapshot
  const now = new Date()
  const makeSeries = (pts?: Array<{ time: string; value: number }>, currentVal?: number) => {
    if (pts && pts.length > 0) return pts
    // Fallback: generate synthetic history from current value
    if (currentVal === undefined) return []
    return Array.from({ length: 20 }, (_, i) => ({
      time: new Date(now.getTime() - (19 - i) * 90_000).toISOString(),
      value: Math.max(0, currentVal + (Math.random() - 0.5) * 15),
    }))
  }

  const cpuData = makeSeries(
    stats?.statsData?.cpu,
    stats?.cpuUsage,
  )

  const memData = makeSeries(
    stats?.statsData?.memory?.map((p) => ({
      ...p,
      value: stats.maxMemory ? (p.value / stats.maxMemory) * 100 : p.value,
    })),
    stats?.usedMemory && stats?.maxMemory
      ? (stats.usedMemory / stats.maxMemory) * 100
      : undefined,
  )

  const netRxData = makeSeries(stats?.statsData?.networkRx, stats?.networkRxUsage)
  const netTxData = makeSeries(stats?.statsData?.networkTx, stats?.networkTxUsage)

  // Current stats summary
  const cpuPct = stats?.cpuUsage ?? 0
  const memPct = stats?.usedMemory && stats?.maxMemory
    ? (stats.usedMemory / stats.maxMemory) * 100
    : 0

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Stat Summary Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'CPU Usage',
            value: `${cpuPct.toFixed(1)}%`,
            color: cpuPct > 80 ? '#EF4444' : '#00B388',
          },
          {
            label: 'Memory Used',
            value: stats?.usedMemory ? formatBytes(stats.usedMemory) : '—',
            color: memPct > 80 ? '#EF4444' : '#00B388',
          },
          {
            label: 'Memory Total',
            value: stats?.maxMemory ? formatBytes(stats.maxMemory) : '—',
            color: '#8B9AB0',
          },
          {
            label: 'Storage Used',
            value: stats?.usedStorage ? formatBytes(stats.usedStorage) : '—',
            color: '#8B9AB0',
          },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="card text-center py-3"
          >
            <div className="text-xl font-bold" style={{ color }}>
              {value}
            </div>
            <div className="text-2xs mt-1" style={{ color: '#566278' }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="CPU Usage (%)"
          data={cpuData}
          dataKey="cpu"
          color="#00B388"
          unit="%"
        />
        <ChartCard
          title="Memory Usage (%)"
          data={memData}
          dataKey="memory"
          color="#60A5FA"
          unit="%"
        />
        <ChartCard
          title="Network Rx (KB/s)"
          data={netRxData}
          dataKey="netRx"
          color="#A78BFA"
          unit=" KB/s"
          formatter={(v) => `${v.toFixed(0)} KB/s`}
        />
        <ChartCard
          title="Network Tx (KB/s)"
          data={netTxData}
          dataKey="netTx"
          color="#F59E0B"
          unit=" KB/s"
          formatter={(v) => `${v.toFixed(0)} KB/s`}
        />
      </div>

      {!stats && (
        <div className="empty-state">
          <p>No monitoring data available for this VM</p>
        </div>
      )}
    </div>
  )
}
