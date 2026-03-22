import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

interface Props {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export function Sparkline({ data, color = '#00B388', width = 80, height = 28 }: Props) {
  const chartData = data.map((v, i) => ({ i, v }))

  return (
    <ResponsiveContainer width={width} height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            return (
              <div
                className="text-2xs px-2 py-1 rounded"
                style={{ background: '#1A2035', border: '1px solid #2A3450' }}
              >
                {Number(payload[0].value).toFixed(1)}%
              </div>
            )
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
