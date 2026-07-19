import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { PracticeTest } from '../types/models'
import { formatDate } from '../utils/format'

interface ScoreChartProps {
  tests: PracticeTest[]
  compact?: boolean
  section?: 'total' | 'reading-writing' | 'math'
  target?: number
}

export function ScoreChart({ tests, compact = false, section = 'total', target = 1400 }: ScoreChartProps) {
  const data = tests.map((test) => ({
    date: formatDate(test.date, { month: 'short' }),
    Total: test.totalScore,
    'R&W': test.readingWritingScore,
    Math: test.mathScore,
  }))
  const isSection = section !== 'total'
  const domain = isSection ? [400, 720] : [800, 1450]
  const goal = isSection ? target / 2 : target

  return (
    <div className={compact ? 'chart chart--compact' : 'chart'} aria-label="Practice test score trend">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: compact ? -24 : -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e8eaf1" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#77809a', fontSize: 11 }} />
          <YAxis domain={domain} tickLine={false} axisLine={false} tick={{ fill: '#9aa1b5', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ border: '1px solid #e2e5ee', borderRadius: 12, boxShadow: '0 10px 30px rgba(25,35,66,.1)' }}
            labelStyle={{ color: '#17233f', fontWeight: 700 }}
          />
          <ReferenceLine y={goal} stroke="#e88955" strokeDasharray="5 5" label={compact ? undefined : { value: 'Goal', fill: '#c96d3f', fontSize: 11 }} />
          {section === 'total' && (
            <Line type="monotone" dataKey="Total" stroke="#635bdb" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 6 }} />
          )}
          {section === 'reading-writing' && (
            <Line type="monotone" dataKey="R&W" stroke="#635bdb" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} />
          )}
          {section === 'math' && (
            <Line type="monotone" dataKey="Math" stroke="#1f9d88" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} />
          )}
          {!compact && section === 'total' && <Legend iconType="circle" />}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
